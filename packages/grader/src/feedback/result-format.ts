import type { z } from "zod";

/**
 * 失敗表示の構成 (design-spec 7.1)。
 *
 * 期待値と実際値を冷静に並べ、問いかけの形で手がかりを渡す。称賛も断罪もしない。
 * 「ここまでは合っている」の提示は verdict/judge と pipeline が担い、ここでは
 * 個々の観点の食い違いを言語化する。
 */

const MAX_VALUE_LENGTH = 120;

/** 値を短い読みやすい表現に整える。長すぎる場合は省略する。 */
export function describeValue(value: unknown): string {
  if (value === undefined) return "undefined (何も返っていない)";
  let text: string;
  try {
    text = JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }
  if (text.length > MAX_VALUE_LENGTH) {
    return `${text.slice(0, MAX_VALUE_LENGTH)}…`;
  }
  return text;
}

/** Zod の検証エラーを一文にまとめる。仕様のどこが食い違ったかを短く伝える。 */
export function summarizeZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (first === undefined) return "仕様と形が合わなかった";
  const path = first.path.length > 0 ? first.path.join(".") : "戻り値";
  return `${path}: ${first.message}`;
}

/** 型・構造が仕様に合わなかったときの問いかけメッセージを作る。 */
export function formatSchemaMismatch(
  actual: unknown,
  error: z.ZodError,
): string {
  return `返ってきた値は ${describeValue(actual)} だったよ。仕様とどこが違うか見比べてみよう (${summarizeZodError(error)})。`;
}

/** 何も返っていないときのメッセージ。 */
export function formatMissingReturn(): string {
  return "値が返ってきていないみたい。return を書き忘れていないかな。";
}
