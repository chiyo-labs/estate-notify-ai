import { createHmac } from 'crypto';

/**
 * LINE Webhook の x-line-signature ヘッダーを検証する。
 * @param rawBody  req.text() で取得したリクエスト本文（未パース）
 * @param signature  x-line-signature ヘッダーの値
 * @param channelSecret  LINE_CHANNEL_SECRET
 */
export function verifyLineSignature(
  rawBody: string,
  signature: string,
  channelSecret: string,
): boolean {
  const digest = createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');
  return digest === signature;
}
