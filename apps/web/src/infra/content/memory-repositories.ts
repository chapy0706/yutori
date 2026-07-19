import { addDays, toDay } from "@/core/learning/progress-service";
import type {
  DashboardRepository,
  PeerCandidate,
} from "@/core/ports/dashboard-repository";
import type { ProfileRepository } from "@/core/ports/profile-repository";
import type {
  ProgressRepository,
  ProgressSnapshot,
} from "@/core/ports/progress-repository";
import type {
  NewSubmission,
  SubmissionRepository,
} from "@/core/ports/submission-repository";

/**
 * DB を使わない fixture モード用のインメモリ永続化。
 * サーバープロセスのメモリに保持するだけで、再起動で消える。開発・検証用。
 *
 * ダッシュボード (issue-10) を DB なしで目視確認できるよう、開発用ユーザー
 * (local-dev-user) にはダミーの活動履歴・並走者・応援をシードする。
 */

/** fixture モードの閲覧・永続化に使う固定ユーザー (current-user.ts と一致)。 */
const LOCAL_DEV_USER = "local-dev-user";

type ProgressRow = {
  attemptCount: number;
  isCleared: boolean;
  workingCode: Record<string, string> | null;
  /** 初回クリア日 ('YYYY-MM-DD')。未クリアなら null。草・週次サマリの元。 */
  firstClearedOn: string | null;
};

const progressStore = new Map<string, ProgressRow>();
const submissionStore: (NewSubmission & { id: string; createdAt: Date })[] = [];
const showRankingStore = new Map<string, boolean>();

const key = (userId: string, taskId: string) => `${userId}::${taskId}`;

/**
 * 課題をクリア扱いにする (スキップ券の使用など、提出以外の経路から)。
 * 初回クリア日は一度確定したら動かさない。reward の memory 実装から使う。
 */
export function markTaskClearedInMemory(
  userId: string,
  taskId: string,
  clearedOn: string,
): void {
  const existing = progressStore.get(key(userId, taskId));
  progressStore.set(key(userId, taskId), {
    attemptCount: existing?.attemptCount ?? 0,
    isCleared: true,
    workingCode: existing?.workingCode ?? null,
    firstClearedOn: existing?.firstClearedOn ?? clearedOn,
  });
}

// ---------------------------------------------------------------------------
// fixture 用ダミーデータのシード (local-dev-user 向け)
// ---------------------------------------------------------------------------

/** 応答をリアルにするための、直近数週間ぶんのダミー活動。 */
function seedFixtureActivity(): void {
  const now = new Date();
  const today = toDay(now);

  // 提出のあった日 (今日からの相対日数)。連続学習日数が 4 日に見えるよう配置。
  const submissionOffsets = [0, 1, 2, 3, 6, 8, 9, 12, 15, 20];
  submissionOffsets.forEach((offset, index) => {
    submissionStore.push({
      id: `seed-sub-${index + 1}`,
      userId: LOCAL_DEV_USER,
      taskId: `seed-task-${index + 1}`,
      result: "passed",
      submittedCode: {},
      axisResults: [],
      degradedTasks: null,
      elapsedMs: null,
      createdAt: new Date(`${addDays(today, -offset)}T09:00:00.000Z`),
    });
  });

  // クリア済み課題 (fixture 課題と衝突しない seed-* の taskId を使う)。
  // 直近クリアが今週・先週にまたがるよう配置し、週次比較を見えるようにする。
  const clearOffsets = [1, 3, 8, 15, 22];
  clearOffsets.forEach((offset, index) => {
    progressStore.set(key(LOCAL_DEV_USER, `seed-clear-${index + 1}`), {
      attemptCount: 1,
      isCleared: true,
      workingCode: null,
      firstClearedOn: addDays(today, -offset),
    });
  });
}

/** 進度の近い並走者候補 (fixture 専用のダミー)。 */
const FIXTURE_PEERS: PeerCandidate[] = [
  {
    userId: "peer-mikan",
    displayName: "みかん",
    clearedCount: 6,
    lastActiveOn: null,
  },
  {
    userId: "peer-koke",
    displayName: "こけし",
    clearedCount: 4,
    lastActiveOn: null,
  },
  {
    userId: "peer-sora",
    displayName: "そら",
    clearedCount: 5,
    lastActiveOn: null,
  },
  {
    userId: "peer-nagi",
    displayName: "なぎ",
    clearedCount: 8,
    lastActiveOn: null,
  },
  {
    userId: "peer-tsumugi",
    displayName: "つむぎ",
    clearedCount: 2,
    lastActiveOn: null,
  },
];

seedFixtureActivity();

// ---------------------------------------------------------------------------

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

  async listProgress(
    userId: string,
    taskIds: string[],
  ): Promise<Record<string, ProgressSnapshot>> {
    const out: Record<string, ProgressSnapshot> = {};
    for (const taskId of taskIds) {
      const row = progressStore.get(key(userId, taskId));
      if (row !== undefined) {
        out[taskId] = {
          isCleared: row.isCleared,
          attemptCount: row.attemptCount,
        };
      }
    }
    return out;
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
      firstClearedOn: existing?.firstClearedOn ?? null,
    });
  }

  async recordAttempt(input: {
    userId: string;
    taskId: string;
    cleared: boolean;
    workingCode: Record<string, string>;
  }): Promise<void> {
    const existing = progressStore.get(key(input.userId, input.taskId));
    const nowCleared = (existing?.isCleared ?? false) || input.cleared;
    progressStore.set(key(input.userId, input.taskId), {
      attemptCount: (existing?.attemptCount ?? 0) + 1,
      isCleared: nowCleared,
      workingCode: input.workingCode,
      // 初回クリア日は一度確定したら動かさない (追記のみの精神)。
      firstClearedOn:
        existing?.firstClearedOn ?? (input.cleared ? toDay(new Date()) : null),
    });
  }
}

export class MemoryDashboardRepository implements DashboardRepository {
  async listSubmissionDays(
    userId: string,
    fromDay: string,
    toDayInclusive: string,
  ): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const submission of submissionStore) {
      if (submission.userId !== userId) continue;
      const day = toDay(submission.createdAt);
      if (day < fromDay || day > toDayInclusive) continue;
      out[day] = (out[day] ?? 0) + 1;
    }
    return out;
  }

  async listClearDays(
    userId: string,
    fromDay: string,
    toDayInclusive: string,
  ): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    const prefix = `${userId}::`;
    for (const [storeKey, row] of progressStore) {
      if (!storeKey.startsWith(prefix)) continue;
      if (!row.isCleared || row.firstClearedOn === null) continue;
      const day = row.firstClearedOn;
      if (day < fromDay || day > toDayInclusive) continue;
      out[day] = (out[day] ?? 0) + 1;
    }
    return out;
  }

  async countClearedTasks(userId: string): Promise<number> {
    const prefix = `${userId}::`;
    let count = 0;
    for (const [storeKey, row] of progressStore) {
      if (storeKey.startsWith(prefix) && row.isCleared) count += 1;
    }
    return count;
  }

  async listPeerCandidates(excludeUserId: string): Promise<PeerCandidate[]> {
    return FIXTURE_PEERS.filter((peer) => peer.userId !== excludeUserId);
  }

  async countUnreadEncouragement(userId: string): Promise<number> {
    // fixture では local-dev-user にだけ未読応援があることにする。
    return userId === LOCAL_DEV_USER ? 1 : 0;
  }
}

export class MemoryProfileRepository implements ProfileRepository {
  async getShowRanking(userId: string): Promise<boolean> {
    return showRankingStore.get(userId) ?? true;
  }

  async setShowRanking(userId: string, showRanking: boolean): Promise<void> {
    showRankingStore.set(userId, showRanking);
  }
}
