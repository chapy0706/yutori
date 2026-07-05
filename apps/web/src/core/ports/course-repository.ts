import type { Course, Task, TestCase } from "@yutori/contracts";

/**
 * コンテンツ (コース・課題・テスト) の取得口。
 *
 * ドメインが要求するインターフェース。実装は infra 層 (content フィクスチャ /
 * Drizzle) が担い、依存方向は infra -> core の一方向に保つ。
 */
export interface CourseRepository {
  findCourseBySlug(slug: string): Promise<Course | null>;
  findTask(courseId: string, taskId: string): Promise<Task | null>;
  findTestCases(taskId: string): Promise<TestCase[]>;
  /** orderIndex がより小さい (先に解いた) 課題を昇順で返す。退化チェック用。 */
  findPreviousTasks(courseId: string, orderIndex: number): Promise<Task[]>;
}
