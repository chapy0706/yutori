import type { QuickJSRuntime } from "quickjs-emscripten";

export const DEFAULT_MEMORY_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB

export function applyMemoryLimit(
  runtime: QuickJSRuntime,
  limitBytes: number = DEFAULT_MEMORY_LIMIT_BYTES,
): void {
  runtime.setMemoryLimit(limitBytes);
}
