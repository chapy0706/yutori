import type { NormalizedError } from "@yutori/sandbox";

import {
  DRIVER_ENTRY,
  RESULT_MARKER,
  buildCallDriver,
  buildReflectDriver,
} from "./driver";
import type { SandboxRunner } from "./runner";

/** ドライバ実行に必要な最小の文脈。 */
export type InvocationTarget = {
  sandbox: SandboxRunner;
  taskId: string;
  timeBudgetMs: number;
  /** 実行対象のファイル一式 (退化差し替え後の実効コード)。 */
  code: Record<string, string>;
  /** import 元ファイルとエクスポート名。 */
  file: string;
  exportName: string;
};

/** エクスポートの型情報 (構造観点・契約観点)。 */
export type ReflectOutcome = {
  timedOut: boolean;
  /** eval / import 段階のエラー (構文エラー・モジュール未解決など)。 */
  error: NormalizedError | null;
  present: boolean;
  isFunction: boolean;
  length: number | null;
};

/** 呼び出し結果 (契約観点・基本観点・仕様観点・頑健観点)。 */
export type CallOutcome = {
  timedOut: boolean;
  /** eval 段階のエラー。呼び出し前に発生した実行不能。 */
  error: NormalizedError | null;
  /** ユーザー関数が throw したか。 */
  threw: boolean;
  thrown: NormalizedError | null;
  /** 呼び出せて値が返ったか (undefined 戻り値も hasValue=false 扱い)。 */
  hasValue: boolean;
  value: unknown;
};

type MarkedPayload = Record<string, unknown>;

function findMarkedPayload(stdout: string[]): MarkedPayload | null {
  // 末尾から探す。ユーザーが同じ行を出力していても、ドライバの出力が最後になる。
  for (let i = stdout.length - 1; i >= 0; i--) {
    const line = stdout[i];
    if (line === undefined) continue;
    const index = line.lastIndexOf(RESULT_MARKER);
    if (index === -1) continue;
    const json = line.slice(index + RESULT_MARKER.length);
    try {
      const parsed = JSON.parse(json);
      if (parsed !== null && typeof parsed === "object") {
        return parsed as MarkedPayload;
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function runDriver(
  target: InvocationTarget,
  driverSource: string,
): Promise<{
  timedOut: boolean;
  error: NormalizedError | null;
  payload: MarkedPayload | null;
}> {
  const submittedCode = { ...target.code, [DRIVER_ENTRY]: driverSource };
  const result = await target.sandbox({
    type: "execute",
    taskId: target.taskId,
    submittedCode,
    entryFile: DRIVER_ENTRY,
    timeBudgetMs: target.timeBudgetMs,
  });
  if (result.timedOut) {
    return { timedOut: true, error: null, payload: null };
  }
  if (result.error !== null) {
    return { timedOut: false, error: result.error, payload: null };
  }
  return {
    timedOut: false,
    error: null,
    payload: findMarkedPayload(result.stdout),
  };
}

/** エクスポートの有無・型・引数個数を取得する。 */
export async function reflectExport(
  target: InvocationTarget,
): Promise<ReflectOutcome> {
  const { timedOut, error, payload } = await runDriver(
    target,
    buildReflectDriver(target.file, target.exportName),
  );
  if (timedOut || error !== null || payload === null) {
    return { timedOut, error, present: false, isFunction: false, length: null };
  }
  return {
    timedOut: false,
    error: null,
    present: payload.present === true,
    isFunction: payload.isFunction === true,
    length: typeof payload.length === "number" ? payload.length : null,
  };
}

/** エクスポートを引数付きで呼び出し、戻り値を取得する。 */
export async function callExport(
  target: InvocationTarget,
  args: unknown[],
): Promise<CallOutcome> {
  const { timedOut, error, payload } = await runDriver(
    target,
    buildCallDriver(target.file, target.exportName, args),
  );
  if (timedOut || error !== null || payload === null) {
    return {
      timedOut,
      error,
      threw: false,
      thrown: null,
      hasValue: false,
      value: undefined,
    };
  }
  if (payload.threw === true) {
    return {
      timedOut: false,
      error: null,
      threw: true,
      thrown: {
        name: typeof payload.name === "string" ? payload.name : "Error",
        message: typeof payload.message === "string" ? payload.message : "",
        stack: null,
      },
      hasValue: false,
      value: undefined,
    };
  }
  const undefinedResult = payload.undefinedResult === true;
  return {
    timedOut: false,
    error: null,
    threw: false,
    thrown: null,
    hasValue: payload.ok === true && !undefinedResult,
    value: undefinedResult ? undefined : payload.value,
  };
}
