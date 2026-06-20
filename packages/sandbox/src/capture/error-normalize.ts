import type { QuickJSContext, QuickJSHandle } from "quickjs-emscripten";

export type NormalizedError = {
  name: string;
  message: string;
  stack: string | null;
};

/**
 * QuickJS エラーハンドルを NormalizedError に変換する。
 * ハンドルの dispose は呼び出し側の責務。
 */
export function normalizeJsError(
  context: QuickJSContext,
  errorHandle: QuickJSHandle,
): NormalizedError {
  const dumped = context.dump(errorHandle);
  if (dumped !== null && typeof dumped === "object") {
    return {
      name: typeof dumped.name === "string" ? dumped.name : "Error",
      message:
        typeof dumped.message === "string" ? dumped.message : String(dumped),
      stack: typeof dumped.stack === "string" ? dumped.stack : null,
    };
  }
  return {
    name: "Error",
    message: String(dumped),
    stack: null,
  };
}

export function normalizeUnknownError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }
  return {
    name: "UnknownError",
    message: String(error),
    stack: null,
  };
}
