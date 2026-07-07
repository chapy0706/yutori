/**
 * DB モード用のシードスクリプト。
 *
 * fixture と同じコンテンツ (2 数の和 add / 数を2倍 double の 2 コース) を
 * コンテンツ系テーブルへ投入する。これにより YUTORI_CONTENT_SOURCE=db でも
 * コース一覧・課題ページを体験でき、提出結果が submissions / task_progress に
 * 永続化される。
 *
 * 実行 (apps/web で):
 *   DATABASE_URL=postgres://... pnpm db:seed
 *
 * 冪等: コース・課題は onConflictDoNothing、テストケースは対象課題ぶんを
 * 削除してから入れ直す。fixture の文字列 ID を固定 UUID に写像して FK を揃える。
 */
import { inArray } from "drizzle-orm";

// tsx は tsconfig の @/ エイリアスを解決しないため、seed は相対 import で書く。
import {
  FIXTURE_ALL_TEST_CASES,
  FIXTURE_COURSES,
  FIXTURE_TASKS,
} from "../content/fixtures";
import { getDb } from "./client";
import { courses, tasks, testCases } from "./schema";

// fixture の文字列 ID -> DB の固定 UUID。検証時に URL で辿れるようにする。
const COURSE_UUID: Record<string, string> = {
  "js-basics": "11111111-1111-1111-1111-111111111111",
  doubler: "11111111-1111-1111-1111-111111111112",
};
const TASK_UUID: Record<string, string> = {
  sum: "22222222-2222-2222-2222-222222222222",
  double: "22222222-2222-2222-2222-222222222223",
};

async function main() {
  const db = getDb();

  for (const course of FIXTURE_COURSES) {
    const id = COURSE_UUID[course.id];
    if (id === undefined) continue;
    await db
      .insert(courses)
      .values({
        id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        orderIndex: course.orderIndex,
        playableBuildPath: course.playableBuildPath,
        finalSpec: course.finalSpec,
        isPublished: course.isPublished,
      })
      .onConflictDoNothing();
  }

  for (const task of FIXTURE_TASKS) {
    const id = TASK_UUID[task.id];
    const courseId = COURSE_UUID[task.courseId];
    if (id === undefined || courseId === undefined) continue;
    await db
      .insert(tasks)
      .values({
        id,
        courseId,
        orderIndex: task.orderIndex,
        title: task.title,
        description: task.description,
        targetFiles: task.targetFiles,
        contractSchema: task.contractSchema,
        timeBudgetMs: task.timeBudgetMs,
        goalMediaPath: task.goalMediaPath,
        referenceImpl: task.referenceImpl,
      })
      .onConflictDoNothing();
  }

  // テストケースは入れ直し (冪等性のため対象課題ぶんを削除)。
  const taskUuids = Object.values(TASK_UUID);
  await db.delete(testCases).where(inArray(testCases.taskId, taskUuids));
  const rows = FIXTURE_ALL_TEST_CASES.flatMap((testCase) => {
    const taskId = TASK_UUID[testCase.taskId];
    if (taskId === undefined) return [];
    return [
      {
        taskId,
        axis: testCase.axis,
        orderIndex: testCase.orderIndex,
        payload: testCase.payload,
      },
    ];
  });
  if (rows.length > 0) await db.insert(testCases).values(rows);

  console.log("seed 完了");
  console.log("  コース一覧: /courses");
  console.log(`  課題ページ: /courses/js-basics/tasks/${TASK_UUID.sum}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("seed に失敗しました:", error);
    process.exit(1);
  });
