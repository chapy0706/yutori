import type { QuickJSRuntime } from "quickjs-emscripten";

export type TimeBudgetHandle = {
  didTimeout: () => boolean;
};

/**
 * タイムアウトポリシーを runtime に適用する。
 * interrupt handler が発火すると、evalCode はエラーを返して終了する。
 *
 * 重要: interrupt 発火後は runtime/context を dispose してはならない。
 * QuickJS の GC スタックに未解放オブジェクトが残るため dispose がクラッシュする。
 * Worker 終了時に OS がメモリを回収する前提。
 */
export function applyTimeBudget(
  runtime: QuickJSRuntime,
  timeBudgetMs: number,
): TimeBudgetHandle {
  let timedOut = false;
  const deadline = Date.now() + timeBudgetMs;

  runtime.setInterruptHandler(() => {
    if (Date.now() > deadline) {
      timedOut = true;
      return true;
    }
    return false;
  });

  return { didTimeout: () => timedOut };
}
