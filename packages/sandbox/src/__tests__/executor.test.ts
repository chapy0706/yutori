import { describe, expect, it } from "vitest";
import { runInSandbox } from "../runtime/executor";
import type { ExecutionRequest } from "../worker/protocol";

function req(
  overrides: Partial<ExecutionRequest> & {
    submittedCode: Record<string, string>;
  },
): ExecutionRequest {
  return {
    type: "execute",
    taskId: "test-task",
    entryFile: "main.js",
    timeBudgetMs: 2000,
    ...overrides,
  };
}

describe("runInSandbox", () => {
  it("console.log の出力を捕捉する", async () => {
    const result = await runInSandbox(
      req({
        submittedCode: {
          "main.js": 'console.log("hello"); console.log("world");',
        },
      }),
    );
    expect(result.error).toBeNull();
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toEqual(["hello", "world"]);
  });

  it("数値・オブジェクトを JSON 化して出力する", async () => {
    const result = await runInSandbox(
      req({
        submittedCode: { "main.js": "console.log(42); console.log({a: 1});" },
      }),
    );
    expect(result.stdout).toEqual(["42", '{"a":1}']);
  });

  it("JS 構文エラーをキャプチャする", async () => {
    const result = await runInSandbox(
      req({ submittedCode: { "main.js": "const x = {;" } }),
    );
    expect(result.error).not.toBeNull();
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toEqual([]);
  });

  it("実行時エラーをキャプチャする", async () => {
    const result = await runInSandbox(
      req({ submittedCode: { "main.js": 'throw new Error("boom");' } }),
    );
    expect(result.error).not.toBeNull();
    expect(result.error?.message).toContain("boom");
    expect(result.timedOut).toBe(false);
  });

  it("モジュールの import が動作する", async () => {
    const result = await runInSandbox(
      req({
        submittedCode: {
          "main.js": 'import { add } from "./math.js"; console.log(add(2, 3));',
          "math.js": "export const add = (a, b) => a + b;",
        },
      }),
    );
    expect(result.error).toBeNull();
    expect(result.stdout).toEqual(["5"]);
  });

  it("過去課題のコードをベースとして利用できる", async () => {
    const result = await runInSandbox(
      req({
        submittedCode: {
          "main.js":
            'import { greet } from "./utils.js"; console.log(greet("Alice"));',
        },
        previousCode: {
          "utils.js": "export const greet = (name) => `Hello, ${name}!`;",
        },
      }),
    );
    expect(result.error).toBeNull();
    expect(result.stdout).toEqual(["Hello, Alice!"]);
  });

  it("存在しないエントリファイルはエラーを返す", async () => {
    const result = await runInSandbox(
      req({
        submittedCode: { "other.js": "console.log(1);" },
        entryFile: "main.js",
      }),
    );
    expect(result.error?.name).toBe("EntryFileError");
    expect(result.timedOut).toBe(false);
  });

  it("タイムアウトを検出する", async () => {
    const result = await runInSandbox(
      req({
        submittedCode: { "main.js": "let i = 0; while (true) { i++; }" },
        timeBudgetMs: 100,
      }),
    );
    expect(result.timedOut).toBe(true);
    expect(result.error).toBeNull();
  }, 5000);

  it("経過時間を記録する", async () => {
    const result = await runInSandbox(
      req({ submittedCode: { "main.js": "1 + 1;" } }),
    );
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.elapsedMs).toBeLessThan(2000);
  });

  it("グローバルに process は存在しない", async () => {
    const result = await runInSandbox(
      req({
        submittedCode: {
          "main.js": "console.log(typeof process);",
        },
      }),
    );
    expect(result.error).toBeNull();
    expect(result.stdout).toEqual(["undefined"]);
  });
});
