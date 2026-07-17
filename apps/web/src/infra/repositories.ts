import type { CourseRepository } from "@/core/ports/course-repository";
import type { DashboardRepository } from "@/core/ports/dashboard-repository";
import type { ProfileRepository } from "@/core/ports/profile-repository";
import type { ProgressRepository } from "@/core/ports/progress-repository";
import type { SubmissionRepository } from "@/core/ports/submission-repository";

import { FixtureCourseRepository } from "@/infra/content/fixture-course-repository";
import {
  MemoryDashboardRepository,
  MemoryProfileRepository,
  MemoryProgressRepository,
  MemorySubmissionRepository,
} from "@/infra/content/memory-repositories";
import { DrizzleCourseRepository } from "@/infra/db/repositories/course-repository.drizzle";
import { DrizzleDashboardRepository } from "@/infra/db/repositories/dashboard-repository.drizzle";
import { DrizzleProfileRepository } from "@/infra/db/repositories/profile-repository.drizzle";
import { DrizzleProgressRepository } from "@/infra/db/repositories/progress-repository.drizzle";
import { DrizzleSubmissionRepository } from "@/infra/db/repositories/submission-repository.drizzle";

/**
 * コンポジションルート。実行環境に応じてリポジトリ実装を選ぶ。
 *
 *   YUTORI_CONTENT_SOURCE=db  -> Drizzle (要 DATABASE_URL + seed 投入)
 *   それ以外 (既定)           -> content フィクスチャ + インメモリ永続化 (DB 不要)
 *
 * コース取得と永続化を同じスイッチで束ねる。fixture の課題は DB に存在しないため、
 * fixture モードで DB へ書くと FK 制約に反する。両者は必ず同じモードで揃える。
 */
function useDatabase(): boolean {
  return process.env.YUTORI_CONTENT_SOURCE === "db";
}

/** DB モードかどうか。永続化に実ユーザー (認証) が必須かの判断に使う。 */
export function isDatabaseMode(): boolean {
  return useDatabase();
}

export function getCourseRepository(): CourseRepository {
  return useDatabase()
    ? new DrizzleCourseRepository()
    : new FixtureCourseRepository();
}

export function getSubmissionRepository(): SubmissionRepository {
  return useDatabase()
    ? new DrizzleSubmissionRepository()
    : new MemorySubmissionRepository();
}

export function getProgressRepository(): ProgressRepository {
  return useDatabase()
    ? new DrizzleProgressRepository()
    : new MemoryProgressRepository();
}

export function getDashboardRepository(): DashboardRepository {
  return useDatabase()
    ? new DrizzleDashboardRepository()
    : new MemoryDashboardRepository();
}

export function getProfileRepository(): ProfileRepository {
  return useDatabase()
    ? new DrizzleProfileRepository()
    : new MemoryProfileRepository();
}
