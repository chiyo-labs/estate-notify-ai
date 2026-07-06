import { WebClient } from '@slack/web-api';
import type { InquiryCategory, InquirySummary } from '@/lib/types';

const CHANNEL_MAP: Record<InquiryCategory, string> = {
  '賃貸': process.env.SLACK_CHANNEL_RENTAL ?? '',
  '売買': process.env.SLACK_CHANNEL_SALE ?? '',
  '内見': process.env.SLACK_CHANNEL_PREVIEW ?? '',
  'クレーム': process.env.SLACK_CHANNEL_COMPLAINT ?? '',
};

let slackClient: WebClient | null = null;

function getSlackClient(): WebClient {
  if (!slackClient) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error('SLACK_BOT_TOKEN が設定されていません。');
    slackClient = new WebClient(token);
  }
  return slackClient;
}

function buildMessage(inquiry: InquirySummary): string {
  const preview = inquiry.body.length > 100
    ? `${inquiry.body.slice(0, 100)}…`
    : inquiry.body;

  return [
    `*【${inquiry.category}】新規問い合わせ*`,
    `受信元: ${inquiry.source} | 送信者ID: ${inquiry.sender_id ?? '不明'}`,
    `本文: ${preview}`,
    `Supabase ID: \`${inquiry.id}\``,
  ].join('\n');
}

/**
 * 問い合わせをカテゴリ別Slackチャンネルに通知する。
 * チャンネル未設定またはAPI失敗時は例外を投げる。
 */
export async function notifySlack(inquiry: InquirySummary): Promise<void> {
  const channelId = CHANNEL_MAP[inquiry.category];
  if (!channelId) {
    throw new Error(
      `Slackチャンネルが設定されていません: category=${inquiry.category}`,
    );
  }

  const result = await getSlackClient().chat.postMessage({
    channel: channelId,
    text: buildMessage(inquiry),
  });

  if (!result.ok) {
    throw new Error(`Slack通知失敗: ${result.error}`);
  }
}
