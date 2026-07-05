import type { Course, Task, TestCase } from "@yutori/contracts";

/**
 * 課題ページが採点に必要とするデータ一式。
 *
 * grader は純粋な部品で DB を知らないため、採点に要るデータ (課題・テスト・過去課題・
 * 模範実装) を UseCase 側でまとめて用意する。UI へはこの束をシリアライズして渡す。
 */
export type TaskBundle = {
  course: Course;
  task: Task;
  testCases: TestCase[];
  /** 退化チェック対象の過去課題 (orderIndex がより小さい課題)。 */
  previousTasks: Task[];
  /** 過去課題の模範実装。taskId をキーにした Record<filepath, code>。 */
  previousReferenceImpls: Record<string, Record<string, string>>;
  /** ユーザーの作業中コード。未着手なら null。 */
  workingCode: Record<string, string> | null;
};
