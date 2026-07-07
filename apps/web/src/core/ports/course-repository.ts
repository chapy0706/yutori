import type { Course, Task, TestCase } from "@yutori/contracts";

/**
 * コンテンツ (コース・課題・テスト) の取得口。
 *
 * ドメインが要求するインターフェース。実装は infra 層 (content フィクスチャ /
 * Drizzle) が担い、依存方向は infra -> core の一方向に保つ。
 */
export interface CourseRepository {
  /** 公開済みコースを orderIndex 昇順で返す (一覧表示用)。 */
  listCourses(): Promise<Course[]>;
  findCourseBySlug(slug: string): Promise<Course | null>;
  findTask(courseId: string, taskId: string): Promise<Task | null>;
  /** コース内の全課題を orderIndex 昇順で返す (課題一覧用)。 */
  listTasks(courseId: string): Promise<Task[]>;
  findTestCases(taskId: string): Promise<TestCase[]>;
  /** orderIndex がより小さい (先に解いた) 課題を昇順で返す。退化チェック用。 */
  findPreviousTasks(courseId: string, orderIndex: number): Promise<Task[]>;
}
