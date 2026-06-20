import { describe, expect, it } from "vitest";

import { CosmeticItemSchema, CosmeticKindSchema } from "../cosmetic";
import { CourseSchema, TaskSchema } from "../course";
import { GradingInputSchema, GradingOutputSchema } from "../grading";
import {
  AxisResultSchema,
  SubmissionResultSchema,
  SubmissionSchema,
} from "../submission";
import {
  TestAxisSchema,
  TestCasePayloadSchema,
  TestCaseSchema,
} from "../test-case";
import { ProfileSchema, UserSchema } from "../user";

// ---------------------------------------------------------------------------
// course
// ---------------------------------------------------------------------------

describe("CourseSchema", () => {
  const validCourse = {
    id: "abc123",
    slug: "tetris",
    title: "テトリスを作ろう",
    description: "テトリスを段階的に実装するコース",
    orderIndex: 0,
    playableBuildPath: null,
    finalSpec: { type: "object" },
    isPublished: false,
    createdAt: new Date(),
  };

  it("正常なデータを parse できる", () => {
    expect(() => CourseSchema.parse(validCourse)).not.toThrow();
  });

  it("slug が空文字なら失敗する", () => {
    const result = CourseSchema.safeParse({ ...validCourse, slug: "" });
    expect(result.success).toBe(false);
  });

  it("orderIndex が負なら失敗する", () => {
    const result = CourseSchema.safeParse({ ...validCourse, orderIndex: -1 });
    expect(result.success).toBe(false);
  });
});

describe("TaskSchema", () => {
  const validTask = {
    id: "task01",
    courseId: "course01",
    orderIndex: 1,
    title: "静止ブロックを表示する",
    description: "黒い画面に静止ブロックが1個表示される（Walking Skeleton）",
    targetFiles: ["block.ts"],
    contractSchema: { type: "object" },
    timeBudgetMs: 3000,
    goalMediaPath: null,
    referenceImpl: { "block.ts": "export function render() {}" },
    createdAt: new Date(),
  };

  it("正常なデータを parse できる", () => {
    expect(() => TaskSchema.parse(validTask)).not.toThrow();
  });

  it("targetFiles が空配列なら失敗する", () => {
    const result = TaskSchema.safeParse({ ...validTask, targetFiles: [] });
    expect(result.success).toBe(false);
  });

  it("orderIndex が 0 なら失敗する（1以上が必要）", () => {
    const result = TaskSchema.safeParse({ ...validTask, orderIndex: 0 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// test-case
// ---------------------------------------------------------------------------

describe("TestAxisSchema", () => {
  it("5観点をすべて parse できる", () => {
    const axes = ["structure", "contract", "basic", "spec", "robustness"];
    for (const axis of axes) {
      expect(TestAxisSchema.parse(axis)).toBe(axis);
    }
  });

  it("未定義の観点は失敗する", () => {
    expect(TestAxisSchema.safeParse("performance").success).toBe(false);
  });
});

describe("TestCasePayloadSchema", () => {
  it("正常なデータを parse できる", () => {
    const payload = {
      input: [1, 2, 3],
      expectedSchema: { type: "array" },
      onFailHint: "配列を返しているか確認してください",
    };
    expect(() => TestCasePayloadSchema.parse(payload)).not.toThrow();
  });

  it("onFailHint が null でも parse できる", () => {
    const payload = { input: 0, expectedSchema: {}, onFailHint: null };
    expect(TestCasePayloadSchema.safeParse(payload).success).toBe(true);
  });
});

describe("TestCaseSchema", () => {
  it("正常なデータを parse できる", () => {
    const tc = {
      id: "tc01",
      taskId: "task01",
      axis: "spec",
      orderIndex: 0,
      payload: { input: [], expectedSchema: {}, onFailHint: null },
    };
    expect(() => TestCaseSchema.parse(tc)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// submission
// ---------------------------------------------------------------------------

describe("SubmissionResultSchema", () => {
  it("4種類の結果をすべて parse できる", () => {
    for (const r of ["passed", "partial", "failed", "error"]) {
      expect(SubmissionResultSchema.parse(r)).toBe(r);
    }
  });
});

describe("AxisResultSchema", () => {
  it("通過した観点を parse できる", () => {
    const r = {
      axis: "structure",
      passed: true,
      failedTestIndex: null,
      hint: null,
    };
    expect(AxisResultSchema.safeParse(r).success).toBe(true);
  });

  it("失敗した観点を parse できる", () => {
    const r = {
      axis: "spec",
      passed: false,
      failedTestIndex: 2,
      hint: "ヒントです",
    };
    expect(AxisResultSchema.safeParse(r).success).toBe(true);
  });
});

describe("SubmissionSchema", () => {
  it("正常なデータを parse できる", () => {
    const submission = {
      id: "sub01",
      userId: "00000000-0000-0000-0000-000000000001",
      taskId: "task01",
      result: "passed",
      submittedCode: { "block.ts": "export function render() {}" },
      axisResults: [
        { axis: "structure", passed: true, failedTestIndex: null, hint: null },
      ],
      degradedTasks: null,
      elapsedMs: 1200,
      createdAt: new Date(),
    };
    expect(() => SubmissionSchema.parse(submission)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// grading
// ---------------------------------------------------------------------------

describe("GradingInputSchema", () => {
  it("正常なデータを parse できる", () => {
    const input = {
      taskId: "task01",
      submittedCode: { "block.ts": "export function render() {}" },
      previousTasks: [],
      previousReferenceImpls: {},
    };
    expect(() => GradingInputSchema.parse(input)).not.toThrow();
  });
});

describe("GradingOutputSchema", () => {
  it("正常なデータを parse できる", () => {
    const output = {
      result: "partial",
      axisResults: [
        { axis: "structure", passed: true, failedTestIndex: null, hint: null },
        {
          axis: "contract",
          passed: false,
          failedTestIndex: 0,
          hint: "型を確認してください",
        },
      ],
      degradedTasks: null,
      elapsedMs: 800,
    };
    expect(() => GradingOutputSchema.parse(output)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// user
// ---------------------------------------------------------------------------

describe("UserSchema", () => {
  it("正常なデータを parse できる", () => {
    const user = {
      id: "00000000-0000-0000-0000-000000000001",
      displayName: "テストユーザー",
      createdAt: new Date(),
    };
    expect(() => UserSchema.parse(user)).not.toThrow();
  });

  it("UUID 形式でない id は失敗する", () => {
    const result = UserSchema.safeParse({
      id: "not-a-uuid",
      displayName: "test",
      createdAt: new Date(),
    });
    expect(result.success).toBe(false);
  });
});

describe("ProfileSchema", () => {
  it("正常なデータを parse できる", () => {
    const profile = {
      userId: "00000000-0000-0000-0000-000000000001",
      bgmEnabled: false,
      seEnabled: false,
      motionPreference: null,
      showRanking: true,
      coinBalance: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveOn: "2026-06-20",
    };
    expect(() => ProfileSchema.parse(profile)).not.toThrow();
  });

  it("lastActiveOn が YYYY-MM-DD 形式でなければ失敗する", () => {
    const result = ProfileSchema.safeParse({
      userId: "00000000-0000-0000-0000-000000000001",
      bgmEnabled: false,
      seEnabled: false,
      motionPreference: null,
      showRanking: true,
      coinBalance: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveOn: "2026/06/20",
    });
    expect(result.success).toBe(false);
  });

  it("coinBalance が負なら失敗する", () => {
    const base = {
      userId: "00000000-0000-0000-0000-000000000001",
      bgmEnabled: false,
      seEnabled: false,
      motionPreference: null,
      showRanking: true,
      coinBalance: -1,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveOn: null,
    };
    expect(ProfileSchema.safeParse(base).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cosmetic
// ---------------------------------------------------------------------------

describe("CosmeticKindSchema", () => {
  it("4種類をすべて parse できる", () => {
    for (const kind of ["background", "icon", "bgm", "se"]) {
      expect(CosmeticKindSchema.parse(kind)).toBe(kind);
    }
  });
});

describe("CosmeticItemSchema", () => {
  it("coinCost が null のアイテムを parse できる", () => {
    const item = {
      id: "item01",
      kind: "background",
      name: "星空",
      assetPath: "/assets/bg/stars.webp",
      coinCost: null,
    };
    expect(() => CosmeticItemSchema.parse(item)).not.toThrow();
  });

  it("coinCost が正の整数のアイテムを parse できる", () => {
    const item = {
      id: "item02",
      kind: "icon",
      name: "ねこ",
      assetPath: "/assets/icon/cat.webp",
      coinCost: 100,
    };
    expect(CosmeticItemSchema.safeParse(item).success).toBe(true);
  });

  it("coinCost が 0 なら失敗する（正の整数が必要）", () => {
    const item = {
      id: "item03",
      kind: "se",
      name: "クリック音",
      assetPath: "/assets/se/click.mp3",
      coinCost: 0,
    };
    expect(CosmeticItemSchema.safeParse(item).success).toBe(false);
  });
});
