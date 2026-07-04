import { describe, expect, it } from "vitest";
import { z } from "zod";

import { resolveHint } from "../feedback/hint-resolver";

function zodError(): z.ZodError {
  const result = z.number().safeParse("x");
  if (result.success) throw new Error("expected failure");
  return result.error;
}

describe("resolveHint", () => {
  it("固有ヒント (onFailHint) を最優先する", () => {
    const hint = resolveHint({
      onFailHint: "固有だよ",
      thrown: {
        name: "TypeError",
        message: "x is not a function",
        stack: null,
      },
    });
    expect(hint).toBe("固有だよ");
  });

  it("throw されたエラーはパターン辞書で解決する", () => {
    const hint = resolveHint({
      thrown: {
        name: "TypeError",
        message: "x is not a function",
        stack: null,
      },
    });
    expect(hint).toContain("関数");
  });

  it("戻り値なしは return を促す", () => {
    expect(resolveHint({ missingReturn: true })).toContain("return");
  });

  it("スキーマ不一致は期待値と実際値を並べる", () => {
    const hint = resolveHint({ schemaError: zodError(), actual: "x" });
    expect(hint).toContain("返ってきた値");
  });

  it("何も無ければリンタ診断に委譲する", () => {
    const hint = resolveHint({
      lintDiagnostics: [{ message: "セミコロンが必要です" }],
    });
    expect(hint).toBe("セミコロンが必要です");
  });

  it("フォールバックヒントを汎用文言の代わりに使う", () => {
    const hint = resolveHint({ fallbackHint: "頑健さを考えてみよう" });
    expect(hint).toBe("頑健さを考えてみよう");
  });
});
