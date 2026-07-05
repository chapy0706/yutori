/**
 * DB モード用のシードスクリプト。
 *
 * fixture と同じおもちゃ課題 (2 数の和 add) をコンテンツ系テーブルへ投入する。
 * これにより YUTORI_CONTENT_SOURCE=db でも課題ページを体験でき、提出結果が
 * submissions / task_progress に永続化される。
 *
 * 実行 (apps/web で):
 *   DATABASE_URL=postgres://... pnpm db:seed
 *
 * 冪等: onConflictDoNothing で二重投入を避ける。テストケースのみ再投入時に
 * 重複しうるため、投入前に当該課題のテストケースを削除してから入れ直す。
 */
import { eq } from "drizzle-orm";

// tsx は tsconfig の @/ エイリアスを解決しないため、seed は相対 import で書く。
import { FIXTURE_TASK, FIXTURE_TEST_CASES } from "../content/fixtures";
import { getDb } from "./client";
import { courses, tasks, testCases } from "./schema";

// 検証時に URL で辿れるよう、ID は固定 UUID にする。
const COURSE_ID = "11111111-1111-1111-1111-111111111111";
const TASK_ID = "22222222-2222-2222-2222-222222222222";

async function main() {
  const db = getDb();

  await db
    .insert(courses)
    .values({
      id: COURSE_ID,
      slug: "js-basics",
      title: "JavaScript の第一歩",
      description: "関数の入力と出力を、仕様で確かめながら書いてみる。",
      orderIndex: 0,
      playableBuildPath: null,
      finalSpec: { type: "object" },
      isPublished: true,
    })
    .onConflictDoNothing();

  await db
    .insert(tasks)
    .values({
      id: TASK_ID,
      courseId: COURSE_ID,
      orderIndex: FIXTURE_TASK.orderIndex,
      title: FIXTURE_TASK.title,
      description: FIXTURE_TASK.description,
      targetFiles: FIXTURE_TASK.targetFiles,
      contractSchema: FIXTURE_TASK.contractSchema,
      timeBudgetMs: FIXTURE_TASK.timeBudgetMs,
      goalMediaPath: FIXTURE_TASK.goalMediaPath,
      referenceImpl: FIXTURE_TASK.referenceImpl,
    })
    .onConflictDoNothing();

  // テストケースは入れ直し (冪等性のため一旦削除)。
  await db.delete(testCases).where(eq(testCases.taskId, TASK_ID));
  await db.insert(testCases).values(
    FIXTURE_TEST_CASES.map((testCase) => ({
      taskId: TASK_ID,
      axis: testCase.axis,
      orderIndex: testCase.orderIndex,
      payload: testCase.payload,
    })),
  );

  console.log("seed 完了");
  console.log("  コース: /courses/js-basics");
  console.log(`  課題ページ: /courses/js-basics/tasks/${TASK_ID}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("seed に失敗しました:", error);
    process.exit(1);
  });
