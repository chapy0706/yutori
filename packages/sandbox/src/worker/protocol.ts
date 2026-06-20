import type { NormalizedError } from "../capture/error-normalize";

export type ExecutionRequest = {
  type: "execute";
  taskId: string;
  submittedCode: Record<string, string>;
  entryFile: string;
  timeBudgetMs: number;
  memoryLimitBytes?: number;
  previousCode?: Record<string, string>;
};

export type ExecutionResult = {
  stdout: string[];
  elapsedMs: number;
  timedOut: boolean;
  error: NormalizedError | null;
};

export type WorkerIncomingEvent = ExecutionRequest;

export type WorkerOutgoingEvent =
  | { type: "stdout"; line: string }
  | { type: "done"; result: ExecutionResult }
  | { type: "error"; error: NormalizedError };
