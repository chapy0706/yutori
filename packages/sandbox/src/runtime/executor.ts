import { getQuickJS } from "quickjs-emscripten";
import {
  normalizeJsError,
  normalizeUnknownError,
} from "../capture/error-normalize";
import { applyApiExposure } from "../policy/api-exposure";
import {
  DEFAULT_MEMORY_LIMIT_BYTES,
  applyMemoryLimit,
} from "../policy/memory-limit";
import { applyTimeBudget } from "../policy/time-budget";
import type { ExecutionRequest, ExecutionResult } from "../worker/protocol";
import { createModuleLinker } from "./module-linker";
import { buildVirtualFs } from "./virtual-fs";

/**
 * QuickJS-WASM サンドボックス内でコードを実行し、結果を返す。
 *
 * API の注意点:
 *   context.evalCode() と runtime.executePendingJobs() は DisposableResult を返す。
 *   DisposableResult は `tag` プロパティを持たないため、
 *   エラー判定は `result.error !== undefined` で行う必要がある。
 *
 * タイムアウト時の注意:
 *   interrupt 発火後は QuickJS の GC スタックに未解放オブジェクトが残るため、
 *   runtime/context の dispose を行うと WASM assertion でクラッシュする。
 *   タイムアウト時は runtime を放棄し、Worker 終了時に OS がメモリを回収する前提とする。
 */
export async function runInSandbox(
  request: ExecutionRequest,
  onStdout?: (line: string) => void,
): Promise<ExecutionResult> {
  const QuickJS = await getQuickJS();
  const runtime = QuickJS.newRuntime();
  const startTime = Date.now();

  applyMemoryLimit(
    runtime,
    request.memoryLimitBytes ?? DEFAULT_MEMORY_LIMIT_BYTES,
  );
  const timeBudget = applyTimeBudget(runtime, request.timeBudgetMs);

  const vfs = buildVirtualFs(request.submittedCode, request.previousCode ?? {});
  runtime.setModuleLoader(createModuleLinker(vfs));

  const context = runtime.newContext();
  const exposed = applyApiExposure(context, onStdout);

  const entryCode = vfs.get(request.entryFile);
  if (!entryCode) {
    context.dispose();
    runtime.dispose();
    return {
      stdout: [],
      elapsedMs: Date.now() - startTime,
      timedOut: false,
      error: {
        name: "EntryFileError",
        message: `Entry file not found in submitted code: ${request.entryFile}`,
        stack: null,
      },
    };
  }

  // DisposableResult を返す。tag ではなく error プロパティでエラーを判定する。
  const evalResult = context.evalCode(entryCode, request.entryFile, {
    type: "module",
  });

  if (evalResult.error !== undefined) {
    // interrupt が evalCode 中に発火した場合も evalResult.error に入る
    if (timeBudget.didTimeout()) {
      evalResult.dispose();
      context.dispose();
      runtime.dispose();
      return {
        stdout: exposed.stdout,
        elapsedMs: Date.now() - startTime,
        timedOut: true,
        error: null,
      };
    }
    // 構文エラーや同期 throw が evalCode の時点で検出された場合
    const error = normalizeJsError(context, evalResult.error);
    evalResult.dispose();
    context.dispose();
    runtime.dispose();
    return {
      stdout: exposed.stdout,
      elapsedMs: Date.now() - startTime,
      timedOut: false,
      error,
    };
  }

  // モジュール exports ハンドルを解放する (type:"module" では通常 undefined handle)
  if (evalResult.value !== undefined) {
    evalResult.dispose();
  }

  // モジュール本体の実行・Promise の解決はここで行われる
  const pendingResult = runtime.executePendingJobs();
  const elapsedMs = Date.now() - startTime;

  if (timeBudget.didTimeout()) {
    // interrupt 後は runtime/context を dispose できない。Worker 終了に任せる。
    return { stdout: exposed.stdout, elapsedMs, timedOut: true, error: null };
  }

  if (pendingResult.error !== undefined) {
    // executePendingJobs の error は QuickJSHandle (JavaScript Error ではない)
    const errorHandle = pendingResult.error;
    const errorContext = errorHandle.context;
    const error = normalizeJsError(errorContext, errorHandle);
    pendingResult.dispose();
    context.dispose();
    runtime.dispose();
    return { stdout: exposed.stdout, elapsedMs, timedOut: false, error };
  }

  context.dispose();
  runtime.dispose();
  return { stdout: exposed.stdout, elapsedMs, timedOut: false, error: null };
}
