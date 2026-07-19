import type { DashboardRepository } from "@/core/ports/dashboard-repository";
import { addDays, toDay } from "@/core/shared/day";

/**
 * 進捗集計の UseCase。
 *
 * 草 (コントリビューショングラフ) と週次サマリを、DB や Next.js に触れず
 * 純粋な集計として組み立てる。日付はすべて 'YYYY-MM-DD' (UTC) 文字列で扱い、
 * ロケールやタイムゾーンに依存する曖昧さを境界へ押し出す (MVP の単純化)。
 */

// 日付ユーティリティは core/shared/day に集約。既存の import 元との互換のため再公開する。
export { addDays, toDay } from "@/core/shared/day";

/** 草に表示する日数 (26 週間ぶん)。スマホでは横スクロールで収める。 */
export const GRASS_DAYS = 182;

/** 週次サマリの「1 週間」= 直近 7 日 (今日を含む)。カレンダー週ではなくローリング。 */
const WEEK_DAYS = 7;

/** 草の 1 マス。count は当日の提出数 (濃淡の元)。 */
export type GrassCell = { day: string; count: number };

export type Contribution = {
  /** 古い日から新しい日への昇順。GRASS_DAYS 日ぶん。 */
  cells: GrassCell[];
  /** クリアした課題のユニーク総数。 */
  uniqueClearedTasks: number;
  /** 連続学習日数。今日が未学習でも、昨日までの連続は途切れさせない (ADR-0006)。 */
  currentStreak: number;
};

export type WeeklyProgress = {
  /** 今週の学習日数 (提出のあった日の数)。 */
  activeDays: number;
  /** 今週クリアした課題数。 */
  clearedTasks: number;
  /** 先週の学習日数。 */
  prevActiveDays: number;
  /** 先週クリアした課題数。 */
  prevClearedTasks: number;
};

export type DashboardOverview = {
  contribution: Contribution;
  weekly: WeeklyProgress;
  /** 未読の応援メッセージ数。 */
  unreadEncouragement: number;
  /** 閲覧者のクリア数。並走者の近さ判定に再利用する。 */
  viewerClearedCount: number;
};

/**
 * 連続学習日数を求める。今日に活動がなければ昨日を起点にする
 * (途切れへのペナルティを与えない獲得志向。ADR-0006)。
 */
function computeStreak(activeDays: Set<string>, today: string): number {
  let cursor = activeDays.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** [fromDay, toDay] (両端含む) の日数と、その範囲内の提出数合計を数える。 */
function activeDaysIn(
  submissionDays: Record<string, number>,
  fromDay: string,
  toDay: string,
): number {
  let count = 0;
  for (let day = fromDay; day <= toDay; day = addDays(day, 1)) {
    if ((submissionDays[day] ?? 0) > 0) count += 1;
  }
  return count;
}

/** [fromDay, toDay] (両端含む) の日別件数を合計する。 */
function sumIn(
  dayCounts: Record<string, number>,
  fromDay: string,
  toDay: string,
): number {
  let total = 0;
  for (let day = fromDay; day <= toDay; day = addDays(day, 1)) {
    total += dayCounts[day] ?? 0;
  }
  return total;
}

/**
 * ダッシュボードの進捗集計をまとめて組み立てる。
 * リポジトリ呼び出しは最小限 (草の範囲の提出日・直近 2 週間のクリア日・総クリア数・未読数)。
 */
export async function loadDashboardOverview(
  repo: DashboardRepository,
  userId: string,
  now: Date,
): Promise<DashboardOverview> {
  const today = toDay(now);
  const grassFrom = addDays(today, -(GRASS_DAYS - 1));
  const twoWeeksFrom = addDays(today, -(WEEK_DAYS * 2 - 1));

  const [submissionDays, clearDays, viewerClearedCount, unreadEncouragement] =
    await Promise.all([
      repo.listSubmissionDays(userId, grassFrom, today),
      repo.listClearDays(userId, twoWeeksFrom, today),
      repo.countClearedTasks(userId),
      repo.countUnreadEncouragement(userId),
    ]);

  const cells: GrassCell[] = [];
  for (let i = GRASS_DAYS - 1; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    cells.push({ day, count: submissionDays[day] ?? 0 });
  }

  const activeSet = new Set(
    Object.entries(submissionDays)
      .filter(([, count]) => count > 0)
      .map(([day]) => day),
  );

  const thisWeekFrom = addDays(today, -(WEEK_DAYS - 1));
  const prevWeekTo = addDays(thisWeekFrom, -1);
  const prevWeekFrom = addDays(prevWeekTo, -(WEEK_DAYS - 1));

  return {
    contribution: {
      cells,
      uniqueClearedTasks: viewerClearedCount,
      currentStreak: computeStreak(activeSet, today),
    },
    weekly: {
      activeDays: activeDaysIn(submissionDays, thisWeekFrom, today),
      clearedTasks: sumIn(clearDays, thisWeekFrom, today),
      prevActiveDays: activeDaysIn(submissionDays, prevWeekFrom, prevWeekTo),
      prevClearedTasks: sumIn(clearDays, prevWeekFrom, prevWeekTo),
    },
    unreadEncouragement,
    viewerClearedCount,
  };
}
