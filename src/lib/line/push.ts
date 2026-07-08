const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * LINE Push が実行可能な設定かどうかを判定する。
 * 未設定の場合はスキップ理由の文字列を返す（設定済みなら null）。
 */
export function getLinePushSkipReason(): string | null {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    return 'LINE_CHANNEL_ACCESS_TOKEN is not set';
  }
  if (!process.env.LINE_MANAGER_USER_ID) {
    return 'LINE_MANAGER_USER_ID is not set';
  }
  return null;
}

/**
 * 営業部長のLINEアカウントへPush通知を送る。
 * クレーム判定時のみ使用する想定。
 * 失敗時は例外を投げる。
 */
export async function pushToManager(message: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません。');
  }

  const userId = process.env.LINE_MANAGER_USER_ID;
  if (!userId) {
    throw new Error('LINE_MANAGER_USER_ID が設定されていません。');
  }

  const res = await fetch(LINE_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LINE Push通知失敗: HTTP ${res.status} ${detail}`);
  }
}
