import { NextRequest, NextResponse } from 'next/server';
import { saveInquiry } from '@/lib/supabase/queries';

interface EmailInquiryRequest {
  external_id: string;
  sender_id?: string;
  sender_name?: string;
  body: string;
}

export async function POST(req: NextRequest) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== internalSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: EmailInquiryRequest;
  try {
    payload = (await req.json()) as EmailInquiryRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { external_id, sender_id, sender_name, body } = payload;

  if (!external_id || !body) {
    return NextResponse.json(
      { error: 'external_id and body are required' },
      { status: 400 },
    );
  }

  const result = await saveInquiry({
    source: 'email',
    external_id,
    sender_id,
    sender_name,
    body,
    raw_payload: payload as unknown as Record<string, unknown>,
  });

  if (result.status === 'failed') {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result });
}
