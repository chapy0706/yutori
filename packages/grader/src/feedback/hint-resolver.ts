import type { NormalizedError } from "@yutori/sandbox";
import type { z } from "zod";

import type { LintDiagnostic } from "../pipeline/lint-stage";
import { lookupHint } from "./hint-dictionary";
import { formatMissingReturn, formatSchemaMismatch } from "./result-format";

/**
 * ヒントの解決。design-spec 7.2 のハイブリッド方式に従い、以下の優先順で決める。
 *
 *   1. 固有  : テストケースの onFailHint (最も文脈に即した主軸)
 *   2. パターン: エラー型に対する辞書引き / 仕様不一致の言語化
 *   3. リンタ委譲: 上で決まらなければ Biome の診断をそのまま渡す
 *
 * それでも決まらなければ、汎用の問いかけを返す (ヒントが空になることは避ける)。
 */
export type HintContext = {
  /** テストケース固有のヒント (payload.onFailHint)。 */
  onFailHint?: string | null;
  /** eval / import 段階のエラー。 */
  execError?: NormalizedError | null;
  /** ユーザー関数が throw したエラー。 */
  thrown?: NormalizedError | null;
  /** 仕様スキーマ不一致。 */
  schemaError?: z.ZodError | null;
  /** 仕様不一致時の実際の戻り値。 */
  actual?: unknown;
  /** 戻り値が undefined だったか。 */
  missingReturn?: boolean;
  /** リンタ診断 (リンタ委譲用)。 */
  lintDiagnostics?: LintDiagnostic[] | null;
  /** 何にも当てはまらないときの観点固有フォールバック (汎用文言の代わり)。 */
  fallbackHint?: string | null;
};

const GENERIC_HINT =
  "いまの結果は仕様と少し違うみたい。通っている観点を手がかりに、次の一歩を考えてみよう。";

export function resolveHint(context: HintContext): string {
  const fallback = context.fallbackHint ?? GENERIC_HINT;
  const fromError = (error: NormalizedError): string =>
    lookupHint(error.name, error.message) ?? fallback;

  // 1. 固有ヒント
  if (context.onFailHint) return context.onFailHint;

  // 2a. throw されたエラー → パターン辞書
  if (context.thrown) return fromError(context.thrown);

  // 2b. eval / import エラー → パターン辞書
  if (context.execError) return fromError(context.execError);

  // 2c. 戻り値なし
  if (context.missingReturn) return formatMissingReturn();

  // 2d. 仕様スキーマ不一致 → 期待値・実際値の言語化
  if (context.schemaError) {
    return formatSchemaMismatch(context.actual, context.schemaError);
  }

  // 3. リンタ委譲
  if (context.lintDiagnostics && context.lintDiagnostics.length > 0) {
    return context.lintDiagnostics.map((d) => d.message).join(" / ");
  }

  return fallback;
}
