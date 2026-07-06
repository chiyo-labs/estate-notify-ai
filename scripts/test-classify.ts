import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local を読み込む（classify.ts がAPIキーを使う前に実行）
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { classifyInquiry } from '../src/lib/claude/classify';

interface CsvRow {
  id: string;
  source: string;
  body: string;
  expected_category: string;
  expected_is_urgent: string;
  note: string;
}

interface TestResult {
  id: string;
  body: string;
  expected_category: string;
  expected_is_urgent: boolean;
  actual_category: string | null;
  actual_is_urgent: boolean | null;
  reason: string;
  category_ok: boolean;
  urgent_ok: boolean;
  error: string | null;
}

const OBSERVATION_CATEGORY = '無関係';

async function main() {
  console.log('\nestate-notify-ai 分類精度テスト');
  console.log('================================\n');

  const csvPath = path.resolve(process.cwd(), 'data', 'test-inquiries.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSVファイルが見つかりません: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const evaluationRows = rows.filter((r) => r.expected_category !== OBSERVATION_CATEGORY);
  const observationRows = rows.filter((r) => r.expected_category === OBSERVATION_CATEGORY);

  console.log(`テストデータ: ${rows.length}件`);
  console.log(`  精度計算対象: ${evaluationRows.length}件`);
  console.log(`  観察のみ: ${observationRows.length}件`);
  console.log('\n処理中...\n');

  const results: TestResult[] = [];

  // ── 精度計算対象ケース ──────────────────────────────────────
  for (const row of evaluationRows) {
    process.stdout.write(`  [${row.id.padStart(2)}/${rows.length}] id=${row.id} ... `);

    const result = await classifyInquiry(row.body);
    const expected_is_urgent = row.expected_is_urgent === 'true';

    if (result.status === 'failed') {
      console.log('API失敗');
      results.push({
        id: row.id,
        body: row.body,
        expected_category: row.expected_category,
        expected_is_urgent,
        actual_category: null,
        actual_is_urgent: null,
        reason: '',
        category_ok: false,
        urgent_ok: false,
        error: result.error,
      });
      continue;
    }

    const category_ok = result.category === row.expected_category;
    const urgent_ok = result.is_urgent === expected_is_urgent;
    const mark = category_ok && urgent_ok ? '✓' : '✗';
    console.log(`${mark} category=${result.category} is_urgent=${result.is_urgent}`);

    results.push({
      id: row.id,
      body: row.body,
      expected_category: row.expected_category,
      expected_is_urgent,
      actual_category: result.category,
      actual_is_urgent: result.is_urgent,
      reason: result.reason,
      category_ok,
      urgent_ok,
      error: null,
    });
  }

  // ── 観察ケース ─────────────────────────────────────────────
  const observationDetails: string[] = [];
  for (const row of observationRows) {
    process.stdout.write(`  [${row.id.padStart(2)}/${rows.length}] id=${row.id} (観察) ... `);

    const result = await classifyInquiry(row.body);
    if (result.status === 'ok') {
      console.log(`category=${result.category} is_urgent=${result.is_urgent}`);
      observationDetails.push(
        `  id=${row.id} | body="${row.body}"\n` +
        `    → Claude判定: ${result.category} (is_urgent: ${result.is_urgent})\n` +
        `    → reason: ${result.reason}`,
      );
    } else {
      console.log('API失敗');
      observationDetails.push(`  id=${row.id} | API失敗: ${result.error}`);
    }
  }

  // ── 集計 ───────────────────────────────────────────────────
  const total = results.length;
  const categoryCorrect = results.filter((r) => r.category_ok).length;
  const urgentCorrect = results.filter((r) => r.urgent_ok).length;
  const bothCorrect = results.filter((r) => r.category_ok && r.urgent_ok).length;
  const failed = results.filter((r) => r.error !== null).length;

  const pct = (n: number, d: number) =>
    d === 0 ? 'N/A' : `${((n / d) * 100).toFixed(1)}%`;

  console.log('\n================================');
  console.log('結果サマリー');
  console.log('================================');
  console.log(`精度計算対象: ${total}件`);
  console.log(`  カテゴリ正解:     ${categoryCorrect}/${total} (${pct(categoryCorrect, total)})`);
  console.log(`  緊急判定正解:     ${urgentCorrect}/${total} (${pct(urgentCorrect, total)})`);
  console.log(`  総合正解（両方）: ${bothCorrect}/${total} (${pct(bothCorrect, total)})`);
  if (failed > 0) {
    console.log(`  API失敗:          ${failed}件`);
  }

  const wrong = results.filter((r) => !r.category_ok || !r.urgent_ok);
  if (wrong.length > 0) {
    console.log('\n■ 誤分類・不一致の詳細');
    for (const r of wrong) {
      if (r.error) {
        console.log(`  id=${r.id} | エラー: ${r.error}`);
        continue;
      }
      const catMark = r.category_ok ? '✓' : '✗';
      const urgMark = r.urgent_ok ? '✓' : '✗';
      const bodyPreview = r.body.length > 60 ? `${r.body.slice(0, 60)}…` : r.body;
      console.log(`  id=${r.id} | ${bodyPreview}`);
      console.log(`    カテゴリ ${catMark}: expected=${r.expected_category} / actual=${r.actual_category}`);
      console.log(`    緊急判定 ${urgMark}: expected=${r.expected_is_urgent} / actual=${r.actual_is_urgent}`);
      console.log(`    reason: ${r.reason}`);
    }
  } else {
    console.log('\n■ 誤分類なし');
  }

  if (observationDetails.length > 0) {
    console.log('\n■ 観察ケース（精度計算対象外）');
    console.log('  ※ 4カテゴリ限定のため必ずいずれかに分類される');
    for (const d of observationDetails) console.log(d);
  }

  console.log('');

  // 目標精度（80%）に対する評価
  const categoryRate = total > 0 ? categoryCorrect / total : 0;
  if (categoryRate >= 0.8) {
    console.log(`✓ カテゴリ正解率 ${pct(categoryCorrect, total)} は目標 80% を達成しています。`);
  } else {
    console.log(`✗ カテゴリ正解率 ${pct(categoryCorrect, total)} は目標 80% を下回っています。`);
  }
  console.log('');
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});
