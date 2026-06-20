/// <reference lib="webworker" />

import { normalizeUnknownError } from "../capture/error-normalize";
import { runInSandbox } from "../runtime/executor";
import type { WorkerIncomingEvent, WorkerOutgoingEvent } from "./protocol";

self.addEventListener("message", (event: MessageEvent<WorkerIncomingEvent>) => {
  const req = event.data;
  if (req.type !== "execute") return;

  const onStdout = (line: string) => {
    self.postMessage({ type: "stdout", line } satisfies WorkerOutgoingEvent);
  };

  runInSandbox(req, onStdout)
    .then((result) => {
      self.postMessage({ type: "done", result } satisfies WorkerOutgoingEvent);
    })
    .catch((err: unknown) => {
      self.postMessage({
        type: "error",
        error: normalizeUnknownError(err),
      } satisfies WorkerOutgoingEvent);
    });
});
