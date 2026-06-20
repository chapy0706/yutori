import type { QuickJSContext } from "quickjs-emscripten";

export type ExposedApi = {
  stdout: string[];
};

/**
 * ゲスト空間に安全な API を公開する。
 *
 * 公開するもの: console.log (標準出力のみ)
 * 公開しないもの: fs, process, fetch, setTimeout, clearInterval 等のグローバル
 *
 * console.log の引数は JSON.stringify で文字列化する。
 * undefined は "undefined" の文字列として出力する。
 */
export function applyApiExposure(
  context: QuickJSContext,
  onStdout?: (line: string) => void,
): ExposedApi {
  const stdout: string[] = [];

  const consoleHandle = context.newObject();

  const logHandle = context.newFunction("log", (...args) => {
    const parts = args.map((arg) => {
      const val = context.dump(arg);
      arg.dispose();
      if (val === undefined) return "undefined";
      if (typeof val === "string") return val;
      return JSON.stringify(val);
    });
    const line = parts.join(" ");
    stdout.push(line);
    onStdout?.(line);
  });

  context.setProp(consoleHandle, "log", logHandle);
  logHandle.dispose();

  context.setProp(context.global, "console", consoleHandle);
  consoleHandle.dispose();

  return { stdout };
}
