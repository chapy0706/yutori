import type { NormalizedError } from "@yutori/sandbox";
import type { z } from "zod";

import { type InvocationTarget, callExport } from "../sandbox/invoke";
import { matchSchema } from "../spec/schema-descriptor";

/**
 * 1 回の呼び出しを実行し、結果を観点判定しやすい形に分類する。
 * 契約・基本・仕様・頑健の各観点はこの分類の解釈だけが異なる。
 */
export type CallEvaluation =
  | { kind: "errored"; hint: string }
  | { kind: "threw"; thrown: NormalizedError }
  | { kind: "missing" }
  | { kind: "mismatch"; error: z.ZodError; actual: unknown }
  | { kind: "ok"; value: unknown };

/**
 * @param schema 適合判定に使うスキーマ記述子。undefined なら戻り値の有無だけを見る。
 */
export async function evaluateCall(
  target: InvocationTarget,
  input: unknown,
  schema: unknown | undefined,
): Promise<CallEvaluation> {
  const args = Array.isArray(input) ? input : [input];
  const outcome = await callExport(target, args);

  if (outcome.timedOut) {
    return {
      kind: "errored",
      hint: "実行が時間内に終わらなかったよ。無限ループや重い処理がないか見てみよう。",
    };
  }
  if (outcome.error !== null) {
    return {
      kind: "errored",
      hint: outcome.error.message,
    };
  }
  if (outcome.threw && outcome.thrown !== null) {
    return { kind: "threw", thrown: outcome.thrown };
  }

  const value = outcome.hasValue ? outcome.value : undefined;

  if (schema === undefined) {
    return value === undefined ? { kind: "missing" } : { kind: "ok", value };
  }

  let match: ReturnType<typeof matchSchema>;
  try {
    match = matchSchema(value, schema);
  } catch {
    return {
      kind: "errored",
      hint: "この課題の仕様定義を読み込めなかったよ (仕様記述子が不正)。",
    };
  }
  if (match.ok) return { kind: "ok", value };
  if (value === undefined) return { kind: "missing" };
  return { kind: "mismatch", error: match.error, actual: value };
}
