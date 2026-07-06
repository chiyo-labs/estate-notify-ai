import Anthropic from '@anthropic-ai/sdk';
import type { InquiryCategory, ClassifyResult } from '@/lib/types';

const VALID_CATEGORIES: InquiryCategory[] = ['賃貸', '売買', '内見', 'クレーム'];

const SYSTEM_PROMPT = `あなたは不動産管理会社の問い合わせ分類AIです。
受け取った問い合わせ本文を以下の4カテゴリのいずれか1つに分類してください。

【カテゴリ定義】
- 賃貸: 賃貸物件に関する通常の問い合わせ・依頼・相談。
  例: 家賃・共益費の確認、契約更新・退去手続き、設備の修理依頼、鍵の紛失、
      駐車場・ペット可否の問い合わせ、騒音の相談など。
- 売買: 不動産の購入・売却・査定・住宅ローンに関する問い合わせ
- 内見: 物件の内見・見学の予約・希望に関する問い合わせ
- クレーム: 強い不満・苦情・怒り・抗議・対応遅れへの不満が明確に含まれる問い合わせ。
  例: 「苦情を申し上げます」「何度も連絡しているのに対応されない」「管理会社の対応がひどい」
      「改善されなければ法的手段を取る」「損害が出ている」「我慢の限界」など。

【クレームと賃貸の区別】
以下は、強い不満・抗議の言葉がなければ「賃貸」に分類してください。
- 設備の不具合報告（エアコン・電球・水回りなど）→ 単なる修理依頼は「賃貸」
- 鍵の紛失 → 手続き相談なので「賃貸」
- 騒音の相談 → 初回相談・穏やかな表現なら「賃貸」
「クレーム」にするのは、怒り・強い不満・対応への抗議が文面から明確に読み取れる場合のみ。

【否定表現のルール】
「クレームではありません」「至急ではないですが」「緊急ではありません」「苦情ではないですが」
のような否定表現がある場合は、絶対にクレームや緊急と判定しないこと。

【is_urgentのルール】
- is_urgent は category が「クレーム」のときのみ true にすること。
- 否定表現がある場合・単にキーワードが含まれるだけの場合は false にすること。

必ず以下のJSON形式のみで回答してください。説明文・前置き・コードブロック記号は不要です。
{"category":"カテゴリ名","is_urgent":false,"reason":"判定理由を一文で"}`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません。');
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function classifyInquiry(body: string): Promise<ClassifyResult> {
  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `以下の問い合わせを分類してください:\n\n${body.slice(0, 5000)}`,
        },
      ],
    });

    const raw =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    // Claudeがmarkdownコードブロックで囲んで返すケースを除去する
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const text = codeBlockMatch ? codeBlockMatch[1].trim() : raw;

    let parsed: { category: string; is_urgent: boolean; reason: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: 'failed', error: `JSONパース失敗: ${text}` };
    }

    if (!VALID_CATEGORIES.includes(parsed.category as InquiryCategory)) {
      return { status: 'failed', error: `不正なカテゴリ: ${parsed.category}` };
    }

    return {
      status: 'ok',
      category: parsed.category as InquiryCategory,
      is_urgent: Boolean(parsed.is_urgent),
      reason: String(parsed.reason ?? ''),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'failed', error: message };
  }
}
