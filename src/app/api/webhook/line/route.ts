import { NextRequest, NextResponse } from 'next/server';
import { verifyLineSignature } from '@/lib/line/verify';
import { saveInquiry } from '@/lib/supabase/queries';

// LINE Webhook イベントの型定義
interface LineSource {
  type: string;
  userId?: string;
}

interface LineTextMessage {
  type: 'text';
  id: string;
  text: string;
}

interface LineMessageEvent {
  type: 'message';
  message: LineTextMessage;
  source: LineSource;
  replyToken: string;
  timestamp: number;
  mode: string;
}

interface LineWebhookBody {
  destination: string;
  events: Array<LineMessageEvent | { type: string }>;
}

function isTextMessageEvent(e: LineMessageEvent | { type: string }): e is LineMessageEvent {
  return (
    e.type === 'message' &&
    (e as LineMessageEvent).message?.type === 'text'
  );
}

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const signature = req.headers.get('x-line-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing x-line-signature' }, { status: 401 });
  }

  const rawBody = await req.text();

  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: LineWebhookBody;
  try {
    body = JSON.parse(rawBody) as LineWebhookBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const textEvents = body.events.filter(isTextMessageEvent);

  const results = await Promise.all(
    textEvents.map(async (event) => {
      const result = await saveInquiry({
        source: 'line',
        external_id: event.message.id,
        sender_id: event.source.userId,
        body: event.message.text,
        raw_payload: event as unknown as Record<string, unknown>,
      });
      return { message_id: event.message.id, ...result };
    }),
  );

  return NextResponse.json({ ok: true, results });
}
