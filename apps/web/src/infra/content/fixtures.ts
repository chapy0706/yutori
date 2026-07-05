import type { Course, Task, TestCase } from "@yutori/contracts";

/**
 * ローカル content フィクスチャ。
 *
 * DB のシード・リポジトリ層が整うまで、課題ページを DB なしで動かすための
 * おもちゃ課題 (2 数の和を返す add 関数)。DB モードでは seed スクリプトが
 * 同じ内容を投入するため、両モードで同じ課題を体験できる。
 */

const now = new Date("2026-01-01T00:00:00.000Z");

export const FIXTURE_COURSE: Course = {
  id: "js-basics",
  slug: "js-basics",
  title: "JavaScript の第一歩",
  description: "関数の入力と出力を、仕様で確かめながら書いてみる。",
  orderIndex: 0,
  playableBuildPath: null,
  finalSpec: { type: "object" },
  isPublished: true,
  createdAt: now,
};

export const FIXTURE_TASK: Task = {
  id: "sum",
  courseId: "js-basics",
  orderIndex: 1,
  title: "2つの数を足す",
  description:
    "2つの数値を受け取り、その和を返す関数 add を作ろう。値そのものではなく、型と構造が仕様に合っているかで採点される。",
  targetFiles: ["sum.js"],
  contractSchema: {
    export: "add",
    file: "sum.js",
    params: [{ type: "number" }, { type: "number" }],
    returns: { type: "number" },
  },
  timeBudgetMs: 2000,
  goalMediaPath: null,
  referenceImpl: { "sum.js": "export const add = (a, b) => a + b;" },
  createdAt: now,
};

export const FIXTURE_TEST_CASES: TestCase[] = [
  {
    id: "sum-contract-0",
    taskId: "sum",
    axis: "contract",
    orderIndex: 0,
    payload: { input: [1, 2], expectedSchema: null, onFailHint: null },
  },
  {
    id: "sum-basic-0",
    taskId: "sum",
    axis: "basic",
    orderIndex: 0,
    payload: {
      input: [2, 3],
      expectedSchema: { type: "number" },
      onFailHint: "2 と 3 を渡したら、数値がひとつ返ってくるかな。",
    },
  },
  {
    id: "sum-spec-0",
    taskId: "sum",
    axis: "spec",
    orderIndex: 0,
    payload: {
      input: [10, 20],
      expectedSchema: { type: "number" },
      onFailHint: "戻り値は数値型になっているかな。",
    },
  },
  {
    id: "sum-spec-1",
    taskId: "sum",
    axis: "spec",
    orderIndex: 1,
    payload: {
      input: [-5, 5],
      expectedSchema: { type: "number" },
      onFailHint: null,
    },
  },
  {
    id: "sum-robustness-0",
    taskId: "sum",
    axis: "robustness",
    orderIndex: 0,
    payload: {
      input: [0, 0],
      expectedSchema: { type: "number" },
      onFailHint: "0 と 0 のような端の入力でも落ちずに動くかな。",
    },
  },
];

/** slug/taskId が固定フィクスチャに一致するか。 */
export const FIXTURE_SLUG = FIXTURE_COURSE.slug;
export const FIXTURE_TASK_ID = FIXTURE_TASK.id;

export const STARTER_CODE: Record<string, string> = {
  "sum.js":
    "// 2つの数を受け取り、その和を返す add 関数を書いてみよう\n// export const add = (a, b) => ...\n",
};
