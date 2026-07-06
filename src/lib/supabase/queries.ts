import { supabase } from './client';
import type { InquiryCategory, InquiryInsert, InquiryQueue } from '@/lib/types';

export type SaveResult =
  | { status: 'created'; id: string }
  | { status: 'duplicate' }
  | { status: 'failed'; error: string };

/**
 * 問い合わせを inquiry_queue に保存する。
 * (source, external_id) の UNIQUE 制約違反は duplicate として正常扱いする。
 */
export async function saveInquiry(data: InquiryInsert): Promise<SaveResult> {
  const { data: row, error } = await supabase
    .from('inquiry_queue')
    .insert(data)
    .select('id')
    .single();

  if (error) {
    // PostgreSQL UNIQUE 制約違反 (23505)
    if (error.code === '23505') {
      return { status: 'duplicate' };
    }
    return { status: 'failed', error: error.message };
  }

  return { status: 'created', id: row.id as string };
}

/** status = pending の問い合わせを古い順に最大20件取得する */
export async function getPendingInquiries(): Promise<InquiryQueue[]> {
  const { data, error } = await supabase
    .from('inquiry_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) throw new Error(`pending取得失敗: ${error.message}`);
  return (data ?? []) as InquiryQueue[];
}

/** 分類成功時: category / is_urgent / classified_at を保存し status = classified に更新 */
export async function updateClassified(
  id: string,
  category: InquiryCategory,
  isUrgent: boolean,
  classifiedAt: string,
): Promise<void> {
  const { error } = await supabase
    .from('inquiry_queue')
    .update({ category, is_urgent: isUrgent, classified_at: classifiedAt, status: 'classified' })
    .eq('id', id);

  if (error) throw new Error(`classified更新失敗 (id=${id}): ${error.message}`);
}

/** 通知完了時: notified_at を保存し status = notified に更新 */
export async function updateNotified(
  id: string,
  notifiedAt: string,
): Promise<void> {
  const { error } = await supabase
    .from('inquiry_queue')
    .update({ notified_at: notifiedAt, status: 'notified' })
    .eq('id', id);

  if (error) throw new Error(`notified更新失敗 (id=${id}): ${error.message}`);
}

/** 処理失敗時: status = failed に更新 */
export async function updateToFailed(id: string): Promise<void> {
  const { error } = await supabase
    .from('inquiry_queue')
    .update({ status: 'failed' })
    .eq('id', id);

  if (error) console.error(`failed更新失敗 (id=${id}): ${error.message}`);
}
