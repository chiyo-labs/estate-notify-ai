import type { InquiryCategory, InquiryQueue, InquirySource } from '@/lib/types';
import styles from './page.module.css';

// ── Demo data（Supabase未接続時に表示） ──────────────────────────
const DEMO_DATA: InquiryQueue[] = [
  {
    id: 'demo-001',
    source: 'line',
    external_id: 'msg-001',
    sender_id: 'U001',
    sender_name: null,
    body: '先月分の家賃の振込先が変更になったと聞きましたが、正しい口座番号を教えてください。',
    category: '賃貸',
    is_urgent: false,
    status: 'notified',
    raw_payload: null,
    classified_at: '2026-07-01T10:00:00Z',
    notified_at: '2026-07-01T10:01:00Z',
    created_at: '2026-07-01T09:59:00Z',
    updated_at: '2026-07-01T10:01:00Z',
  },
  {
    id: 'demo-002',
    source: 'email',
    external_id: 'mail-001',
    sender_id: 'yamada@example.com',
    sender_name: '山田 太郎',
    body: '管理会社の対応がひどすぎます。何度電話しても折り返しがなく、もう我慢の限界です。',
    category: 'クレーム',
    is_urgent: true,
    status: 'notified',
    raw_payload: null,
    classified_at: '2026-07-01T09:30:00Z',
    notified_at: '2026-07-01T09:31:00Z',
    created_at: '2026-07-01T09:29:00Z',
    updated_at: '2026-07-01T09:31:00Z',
  },
  {
    id: 'demo-003',
    source: 'line',
    external_id: 'msg-002',
    sender_id: 'U002',
    sender_name: null,
    body: '先日掲載されていた2LDKの物件を内見したいのですが、今週末は空いていますか？',
    category: '内見',
    is_urgent: false,
    status: 'classified',
    raw_payload: null,
    classified_at: '2026-07-01T11:00:00Z',
    notified_at: null,
    created_at: '2026-07-01T10:58:00Z',
    updated_at: '2026-07-01T11:00:00Z',
  },
  {
    id: 'demo-004',
    source: 'email',
    external_id: 'mail-002',
    sender_id: 'suzuki@example.com',
    sender_name: '鈴木 花子',
    body: '駅近の3LDKマンションを探しています。予算は4000万円です。物件情報を送ってください。',
    category: '売買',
    is_urgent: false,
    status: 'notified',
    raw_payload: null,
    classified_at: '2026-07-01T08:30:00Z',
    notified_at: '2026-07-01T08:31:00Z',
    created_at: '2026-07-01T08:28:00Z',
    updated_at: '2026-07-01T08:31:00Z',
  },
  {
    id: 'demo-005',
    source: 'line',
    external_id: 'msg-003',
    sender_id: 'U003',
    sender_name: null,
    body: 'エアコンのリモコンが壊れて動かなくなりました。交換をお願いできますか。',
    category: null,
    is_urgent: false,
    status: 'pending',
    raw_payload: null,
    classified_at: null,
    notified_at: null,
    created_at: '2026-07-01T12:00:00Z',
    updated_at: '2026-07-01T12:00:00Z',
  },
  {
    id: 'demo-006',
    source: 'email',
    external_id: 'mail-003',
    sender_id: 'tanaka@example.com',
    sender_name: '田中 次郎',
    body: '先月報告した水漏れがいまだに修理されていません。毎日困っています。早急に対応してください！',
    category: null,
    is_urgent: false,
    status: 'failed',
    raw_payload: null,
    classified_at: null,
    notified_at: null,
    created_at: '2026-07-01T07:00:00Z',
    updated_at: '2026-07-01T07:05:00Z',
  },
];

// ── データ取得（Supabase失敗時はdemoデータにフォールバック） ─────
async function fetchInquiries(): Promise<{ rows: InquiryQueue[]; isDemo: boolean }> {
  try {
    const { supabase } = await import('@/lib/supabase/client');
    const { data, error } = await supabase
      .from('inquiry_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return { rows: DEMO_DATA, isDemo: true };
    return { rows: (data ?? []) as InquiryQueue[], isDemo: false };
  } catch {
    return { rows: DEMO_DATA, isDemo: true };
  }
}

// ── ヘルパー ──────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function categoryBadgeClass(cat: InquiryCategory): string {
  const map: Record<InquiryCategory, string> = {
    '賃貸': styles.catRental,
    '売買': styles.catSale,
    '内見': styles.catPreview,
    'クレーム': styles.catComplaint,
  };
  return map[cat];
}

function statusBadgeClass(status: InquiryQueue['status']): string {
  const map: Record<InquiryQueue['status'], string> = {
    pending:    styles.statusPending,
    classified: styles.statusClassified,
    notified:   styles.statusNotified,
    failed:     styles.statusFailed,
  };
  return map[status];
}

function sourceBadgeClass(source: InquirySource): string {
  return source === 'line' ? styles.sourceLine : styles.sourceEmail;
}

// ── ページ本体 ───────────────────────────────────────────────────
export default async function DashboardPage() {
  const { rows, isDemo } = await fetchInquiries();

  const total        = rows.length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const notifiedCount = rows.filter((r) => r.status === 'notified').length;
  const urgentCount  = rows.filter((r) => r.is_urgent).length;

  return (
    <div className={styles.wrapper}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>不動産問い合わせ通知システム</h1>
          <p className={styles.subtitle}>マルチチャネル通知 + AI自動分類</p>
        </div>
        {isDemo && <span className={styles.demoBadge}>デモデータ表示中</span>}
      </header>

      <main className={styles.main}>
        {/* 概要カード */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>総問い合わせ数</span>
            <span className={styles.statValue}>{total}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>未分類</span>
            <span className={`${styles.statValue} ${styles.statPending}`}>{pendingCount}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>通知済み</span>
            <span className={`${styles.statValue} ${styles.statNotified}`}>{notifiedCount}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>緊急</span>
            <span className={`${styles.statValue} ${styles.statUrgent}`}>{urgentCount}</span>
          </div>
        </div>

        {/* 問い合わせ一覧 */}
        <div className={styles.tableWrapper}>
          <h2 className={styles.sectionTitle}>問い合わせ一覧</h2>
          {rows.length === 0 ? (
            <p className={styles.empty}>問い合わせはまだありません。</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>受信日時</th>
                    <th>受信元</th>
                    <th>送信者</th>
                    <th>カテゴリ</th>
                    <th>緊急</th>
                    <th>ステータス</th>
                    <th>本文</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className={styles.nowrap}>{formatDate(row.created_at)}</td>
                      <td>
                        <span className={`${styles.badge} ${sourceBadgeClass(row.source)}`}>
                          {row.source === 'line' ? 'LINE' : 'Email'}
                        </span>
                      </td>
                      <td className={styles.sender}>
                        {row.sender_name ?? row.sender_id ?? '—'}
                      </td>
                      <td>
                        {row.category ? (
                          <span className={`${styles.badge} ${categoryBadgeClass(row.category)}`}>
                            {row.category}
                          </span>
                        ) : (
                          <span className={styles.dash}>—</span>
                        )}
                      </td>
                      <td className={styles.center}>
                        {row.is_urgent ? (
                          <span className={styles.urgentIcon} title="緊急">🚨</span>
                        ) : (
                          <span className={styles.dash}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${statusBadgeClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className={styles.bodyCell}>
                        {row.body.length > 60 ? `${row.body.slice(0, 60)}…` : row.body}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
