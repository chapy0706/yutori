import type { ExecutionResult, NormalizedError } from "@yutori/sandbox";

import { RESULT_MARKER } from "../sandbox/driver";
import type { SandboxRunner } from "../sandbox/runner";

/**
 * sandbox のモック。
 *
 * QuickJS-WASM の代わりに、注入した JS 関数を Node 上で実行してドライバの出力を
 * 再現する。これにより grader の判定ロジック (ドライバ生成・stdout 解析・観点判定)
 * を、実際の WASM 実行なしで軽量に検証できる (issue-07 の設計判断)。
 *
 * 各エクスポートは名前 -> 実装 (関数でない値も可) のマップで与える。マップに無い
 * 名前は「エクスポートが存在しない」を意味する。
 */
export type StubExports = Record<string, unknown>;

function marked(payload: unknown): ExecutionResult {
  return {
    stdout: [RESULT_MARKER + JSON.stringify(payload)],
    elapsedMs: 1,
    timedOut: false,
    error: null,
  };
}

function extractExportName(driver: string): string {
  const match = driver.match(/__ns\[("(?:[^"\\]|\\.)*")\]/);
  if (match?.[1] === undefined)
    throw new Error("stub: export 名を解釈できない");
  return JSON.parse(match[1]) as string;
}

function extractArgs(driver: string): unknown[] {
  const match = driver.match(/const __args = (.+);$/m);
  if (match?.[1] === undefined) throw new Error("stub: 引数を解釈できない");
  return JSON.parse(match[1]) as unknown[];
}

export function makeSandbox(exports: StubExports): SandboxRunner {
  return async (request) => {
    const driver = request.submittedCode[request.entryFile];
    if (driver === undefined) throw new Error("stub: entry が無い");

    const name = extractExportName(driver);
    const present = Object.hasOwn(exports, name);
    const target = exports[name];
    const isFunction = typeof target === "function";

    // reflect ドライバ (呼び出しなし)
    if (!driver.includes("const __args =")) {
      return marked({
        present,
        isFunction,
        length: isFunction
          ? (target as (...a: unknown[]) => unknown).length
          : null,
      });
    }

    // call ドライバ
    if (!isFunction) {
      return marked({ ok: false, notFunction: true });
    }
    const args = extractArgs(driver);
    try {
      const value = await Promise.resolve(
        (target as (...a: unknown[]) => unknown)(...args),
      );
      return marked({
        ok: true,
        undefinedResult: value === undefined,
        value: value === undefined ? null : value,
      });
    } catch (error) {
      const err = error as { name?: string; message?: string };
      return marked({
        ok: false,
        threw: true,
        name: typeof err?.name === "string" ? err.name : "Error",
        message: typeof err?.message === "string" ? err.message : String(error),
      });
    }
  };
}

/** eval / import 段階のエラー (構文エラー等) を返す sandbox。 */
export function erroringSandbox(error: NormalizedError): SandboxRunner {
  return async () => ({
    stdout: [],
    elapsedMs: 1,
    timedOut: false,
    error,
  });
}

/** タイムアウトを返す sandbox。 */
export function timingOutSandbox(): SandboxRunner {
  return async () => ({
    stdout: [],
    elapsedMs: 1,
    timedOut: true,
    error: null,
  });
}
