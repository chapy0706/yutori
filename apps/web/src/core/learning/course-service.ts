import type { Course, Task } from "@yutori/contracts";

import type { CourseRepository } from "@/core/ports/course-repository";
import type {
  ProgressRepository,
  ProgressSnapshot,
} from "@/core/ports/progress-repository";

import type { TaskBundle } from "./task-bundle";

/** 課題の到達状態。 */
export type TaskState = "untouched" | "attempting" | "cleared";

/** コース一覧の 1 項目。unlocked は「作る権利」の有無 (遊ぶ・見るは常に可)。 */
export type CourseListItem = {
  course: Course;
  unlocked: boolean;
};

/** コース詳細 (課題一覧) の 1 項目。 */
export type TaskListItem = {
  task: Task;
  state: TaskState;
};

export type CourseDetail = {
  course: Course;
  unlocked: boolean;
  tasks: TaskListItem[];
};

function stateOf(snapshot: ProgressSnapshot | undefined): TaskState {
  if (snapshot === undefined) return "untouched";
  if (snapshot.isCleared) return "cleared";
  return snapshot.attemptCount > 0 ? "attempting" : "untouched";
}

/**
 * アンロック判定 (MVP ルール)。
 * 最初のコース (orderIndex 最小) は常にアンロック。その最初の課題をクリアすると、
 * 以降のコースが一斉にアンロックされる。「ロックされるのは作る権利だけ」。
 */
function isUnlocked(
  course: Course,
  firstCourse: Course | null,
  gateCleared: boolean,
): boolean {
  if (firstCourse === null) return false;
  if (course.orderIndex <= firstCourse.orderIndex) return true;
  return gateCleared;
}

/**
 * 課題ページの表示・採点に必要なデータ束を組み立てる UseCase。
 *
 * Route Handler や Component にこのロジックを書かず、ここへ集約する。
 * 依存 (リポジトリ) は port 経由で受け取り、DB や Next.js を直接触らない。
 */
export async function loadTaskBundle(
  courses: CourseRepository,
  progress: ProgressRepository | null,
  params: { slug: string; taskId: string; userId: string | null },
): Promise<TaskBundle | null> {
  const course = await courses.findCourseBySlug(params.slug);
  if (course === null) return null;

  const task = await courses.findTask(course.id, params.taskId);
  if (task === null) return null;

  const [testCases, previousTasks] = await Promise.all([
    courses.findTestCases(task.id),
    courses.findPreviousTasks(course.id, task.orderIndex),
  ]);

  const previousReferenceImpls: Record<
    string,
    Record<string, string>
  > = Object.fromEntries(
    previousTasks.map((previous) => [previous.id, previous.referenceImpl]),
  );

  const workingCode =
    params.userId !== null && progress !== null
      ? await progress.findWorkingCode(params.userId, task.id)
      : null;

  return {
    course,
    task,
    testCases,
    previousTasks,
    previousReferenceImpls,
    workingCode,
  };
}

/** 最初のコースの最初の課題 (ゲート) がクリア済みかを判定する。 */
async function isGateCleared(
  courses: CourseRepository,
  progress: ProgressRepository | null,
  userId: string | null,
  firstCourse: Course | null,
): Promise<boolean> {
  if (firstCourse === null || userId === null || progress === null) {
    return false;
  }
  const tasks = await courses.listTasks(firstCourse.id);
  const gate = tasks[0] ?? null;
  if (gate === null) return false;
  const snapshots = await progress.listProgress(userId, [gate.id]);
  return snapshots[gate.id]?.isCleared ?? false;
}

/** コース一覧をアンロック状態つきで返す UseCase。 */
export async function listCourses(
  courses: CourseRepository,
  progress: ProgressRepository | null,
  userId: string | null,
): Promise<CourseListItem[]> {
  const all = await courses.listCourses();
  const firstCourse = all[0] ?? null;
  const gateCleared = await isGateCleared(
    courses,
    progress,
    userId,
    firstCourse,
  );
  return all.map((course) => ({
    course,
    unlocked: isUnlocked(course, firstCourse, gateCleared),
  }));
}

/** コース詳細 (課題一覧) を進捗状態つきで返す UseCase。 */
export async function loadCourseDetail(
  courses: CourseRepository,
  progress: ProgressRepository | null,
  params: { slug: string; userId: string | null },
): Promise<CourseDetail | null> {
  const course = await courses.findCourseBySlug(params.slug);
  if (course === null) return null;

  const all = await courses.listCourses();
  const firstCourse = all[0] ?? null;
  const gateCleared = await isGateCleared(
    courses,
    progress,
    params.userId,
    firstCourse,
  );
  const unlocked = isUnlocked(course, firstCourse, gateCleared);

  const tasks = await courses.listTasks(course.id);
  const snapshots =
    params.userId !== null && progress !== null
      ? await progress.listProgress(
          params.userId,
          tasks.map((task) => task.id),
        )
      : {};

  const items: TaskListItem[] = tasks.map((task) => ({
    task,
    state: stateOf(snapshots[task.id]),
  }));

  return { course, unlocked, tasks: items };
}
