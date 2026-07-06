export type InquirySource = 'line' | 'email';

export type InquiryCategory = '賃貸' | '売買' | '内見' | 'クレーム';

export type InquiryStatus = 'pending' | 'classified' | 'notified' | 'failed';

export interface InquiryQueue {
  id: string;
  source: InquirySource;
  external_id: string;
  sender_id: string | null;
  sender_name: string | null;
  body: string;
  category: InquiryCategory | null;
  is_urgent: boolean;
  status: InquiryStatus;
  raw_payload: Record<string, unknown> | null;
  classified_at: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type InquiryInsert = Pick<
  InquiryQueue,
  'source' | 'external_id' | 'body'
> & {
  sender_id?: string;
  sender_name?: string;
  raw_payload?: Record<string, unknown>;
};

/** Claude分類の結果 */
export type ClassifyResult =
  | { status: 'ok'; category: InquiryCategory; is_urgent: boolean; reason: string }
  | { status: 'failed'; error: string };

/** Slack通知に渡す問い合わせのサマリ */
export interface InquirySummary {
  id: string;
  source: InquirySource;
  sender_id: string | null;
  body: string;
  category: InquiryCategory;
}

/** Webhook受信時の緊急候補チェック用キーワード */
export const URGENT_KEYWORDS = [
  'クレーム',
  '至急',
  '苦情',
  '怒り',
  '激怒',
  '最悪',
  '訴える',
  '返金',
  '解約',
] as const;
