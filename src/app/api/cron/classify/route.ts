import { NextRequest, NextResponse } from 'next/server';
import { classifyInquiry } from '@/lib/claude/classify';
import { notifySlack } from '@/lib/slack/notify';
import { pushToManager, getLinePushSkipReason } from '@/lib/line/push';
import {
  getPendingInquiries,
  updateClassified,
  updateNotified,
  updateToFailed,
} from '@/lib/supabase/queries';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let inquiries;
  try {
    inquiries = await getPendingInquiries();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `pending取得失敗: ${message}` }, { status: 500 });
  }

  const stats = { processed: 0, notified: 0, failed: 0 };

  for (const inquiry of inquiries) {
    stats.processed++;

    // ── 1. Claude 分類 ──────────────────────────────────────
    const classifyResult = await classifyInquiry(inquiry.body);
    if (classifyResult.status === 'failed') {
      console.error(`[classify] id=${inquiry.id} error=${classifyResult.error}`);
      await updateToFailed(inquiry.id);
      stats.failed++;
      continue;
    }

    const { category, is_urgent } = classifyResult;

    // ── 2. 分類結果を DB に保存 ──────────────────────────────
    try {
      await updateClassified(inquiry.id, category, is_urgent, new Date().toISOString());
    } catch (err) {
      console.error(`[updateClassified] id=${inquiry.id}`, err);
      await updateToFailed(inquiry.id);
      stats.failed++;
      continue;
    }

    // ── 3. Slack 通知 ────────────────────────────────────────
    try {
      await notifySlack({
        id: inquiry.id,
        source: inquiry.source,
        sender_id: inquiry.sender_id,
        body: inquiry.body,
        category,
      });
    } catch (err) {
      console.error(`[notifySlack] id=${inquiry.id}`, err);
      await updateToFailed(inquiry.id);
      stats.failed++;
      continue;
    }

    // ── 4. クレーム or 緊急 → LINE Push 通知 ────────────────
    if (category === 'クレーム' || is_urgent) {
      const skipReason = getLinePushSkipReason();
      if (skipReason) {
        console.log(`[pushToManager] id=${inquiry.id} LINE Push skipped: ${skipReason}`);
      } else {
        try {
          const preview = inquiry.body.length > 200
            ? `${inquiry.body.slice(0, 200)}…`
            : inquiry.body;
          await pushToManager(
            `【緊急】新規クレーム問い合わせ\n受信元: ${inquiry.source}\n本文: ${preview}`,
          );
        } catch (err) {
          console.error(`[pushToManager] id=${inquiry.id}`, err);
          await updateToFailed(inquiry.id);
          stats.failed++;
          continue;
        }
      }
    }

    // ── 5. 通知完了 ──────────────────────────────────────────
    try {
      await updateNotified(inquiry.id, new Date().toISOString());
      stats.notified++;
    } catch (err) {
      console.error(`[updateNotified] id=${inquiry.id}`, err);
      await updateToFailed(inquiry.id);
      stats.failed++;
    }
  }

  return NextResponse.json(stats);
}
