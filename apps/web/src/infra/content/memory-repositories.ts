import type { ProgressRepository } from "@/core/ports/progress-repository";
import type {
  NewSubmission,
  SubmissionRepository,
} from "@/core/ports/submission-repository";

/**
 * DB を使わない fixture モード用のインメモリ永続化。
 * サーバープロセスのメモリに保持するだけで、再起動で消える。開発・検証用。
 */

type ProgressRow = {
  attemptCount: number;
  isCleared: boolean;
  workingCode: Record<string, string> | null;
};

const progressStore = new Map<string, ProgressRow>();
const submissionStore: (NewSubmission & { id: string; createdAt: Date })[] = [];

const key = (userId: string, taskId: string) => `${userId}::${taskId}`;

export class MemorySubmissionRepository implements SubmissionRepository {
  async append(submission: NewSubmission): Promise<{ id: string }> {
    const id = `mem-${submissionStore.length + 1}`;
    submissionStore.push({ ...submission, id, createdAt: new Date() });
    return { id };
  }
}

export class MemoryProgressRepository implements ProgressRepository {
  async findWorkingCode(
    userId: string,
    taskId: string,
  ): Promise<Record<string, string> | null> {
    return progressStore.get(key(userId, taskId))?.workingCode ?? null;
  }

  async saveWorkingCode(
    userId: string,
    taskId: string,
    workingCode: Record<string, string>,
  ): Promise<void> {
    const existing = progressStore.get(key(userId, taskId));
    progressStore.set(key(userId, taskId), {
      attemptCount: existing?.attemptCount ?? 0,
      isCleared: existing?.isCleared ?? false,
      workingCode,
    });
  }

  async recordAttempt(input: {
    userId: string;
    taskId: string;
    cleared: boolean;
    workingCode: Record<string, string>;
  }): Promise<void> {
    const existing = progressStore.get(key(input.userId, input.taskId));
    progressStore.set(key(input.userId, input.taskId), {
      attemptCount: (existing?.attemptCount ?? 0) + 1,
      isCleared: (existing?.isCleared ?? false) || input.cleared,
      workingCode: input.workingCode,
    });
  }
}
