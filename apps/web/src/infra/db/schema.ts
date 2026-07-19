/**
 * Drizzle ORM スキーマ定義（PostgreSQL / Oracle Cloud A1 上）
 *
 * 設計方針:
 * 1. コンテンツ系（Course/Task/TestCase/Hint）と活動記録系
 *    （Submission/TaskProgress）を別系統として扱う。
 *    前者は運営が作る静的データ、後者はユーザーが生む動的データで
 *    変化の速度と所有者が異なるため。
 * 2. テストケース・ヒント・Zod仕様などの「中身」は jsonb カラムに格納する。
 *    型は Zod スキーマで保証し、DB は不透明な塊として持つ。
 *    これにより観点の増減などの仕様変更が DB マイグレーションを伴わない。
 * 3. Cosmetic 系は学習系と完全に独立させる。報酬の取得有無が
 *    学習データに一切影響しないことを、スキーマ構造でも表現する。
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// 列挙型
// ---------------------------------------------------------------------------

/** 採点の最終結果。partial は一部観点のみ通過した状態。 */
export const submissionResultEnum = pgEnum("submission_result", [
  "passed",
  "partial",
  "failed",
  "error",
]);

/** テストの5観点。順序はこの配列の並びに対応する。 */
export const testAxisEnum = pgEnum("test_axis", [
  "structure",
  "contract",
  "basic",
  "spec",
  "robustness",
]);

/** Cosmetic アイテムの種別。 */
export const cosmeticKindEnum = pgEnum("cosmetic_kind", [
  "background",
  "icon",
  "bgm",
  "se",
]);

/** Cosmetic の入手経路。 */
export const acquisitionSourceEnum = pgEnum("acquisition_source", [
  "coin",
  "task_clear",
  "course_clear",
  "gacha",
]);

// ===========================================================================
// 学習者系
// ===========================================================================

/**
 * users: 認証の主体。
 * 認証情報そのもの（パスワード等）は Keycloak が管理するため、
 * このテーブルは Keycloak の sub（subject UUID）を参照する薄い存在とする。
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Keycloak の sub と一致させる
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * profiles: 学習設定や状態。users と 1対1。
 * users と分けるのは、認証アイデンティティ（不変）と
 * 設定・状態（可変）の関心を分離するため。
 */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** 主体性原則に基づき、音はデフォルト false。 */
  bgmEnabled: boolean("bgm_enabled").notNull().default(false),
  seEnabled: boolean("se_enabled").notNull().default(false),
  /** null は OS 設定に従う。初回アクセス時にクライアントが解決してセットする。 */
  motionPreference: text("motion_preference"),
  showRanking: boolean("show_ranking").notNull().default(true),
  coinBalance: integer("coin_balance").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  /** 'YYYY-MM-DD' 形式。草・連続日数の判定用。 */
  lastActiveOn: text("last_active_on"),
});

// ===========================================================================
// コンテンツ系（運営が作る静的データ）
// ===========================================================================

/**
 * courses: 一つのゲームを完成させる学習コース。
 * finalSpec は完成形の仕様（Zod スキーマの定義を JSON 化したもの）。
 */
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  orderIndex: integer("order_index").notNull(),
  playableBuildPath: text("playable_build_path"),
  finalSpec: jsonb("final_spec").notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * tasks: コース内の一つの課題。
 * Walking Skeleton 思想により order の小さい課題ほど薄く端から端まで動く。
 */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    targetFiles: jsonb("target_files").notNull(), // string[]
    contractSchema: jsonb("contract_schema").notNull(),
    timeBudgetMs: integer("time_budget_ms").notNull(),
    goalMediaPath: text("goal_media_path"),
    referenceImpl: jsonb("reference_impl").notNull(), // Record<filepath, code>
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    courseOrderUnique: unique().on(t.courseId, t.orderIndex),
    courseIdx: index("tasks_course_idx").on(t.courseId),
  }),
);

/**
 * testCases: 課題のテストケース。観点ごとに複数持てる。
 * テストの「中身」は payload に格納し、観点が増減しても
 * DB マイグレーションが不要な構造とする。
 */
export const testCases = pgTable(
  "test_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    axis: testAxisEnum("axis").notNull(),
    orderIndex: integer("order_index").notNull(),
    payload: jsonb("payload").notNull(),
  },
  (t) => ({
    taskIdx: index("test_cases_task_idx").on(t.taskId),
  }),
);

/**
 * hints: パターンマッチング方式のヒント辞書。
 * テスト固有ヒントは testCases.payload 内に持つため、ここは
 * エラー型などに対する汎用ヒントを担う。
 * courseId が null ならサービス全体で共有する汎用ヒント。
 */
export const hints = pgTable("hints", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  matcher: jsonb("matcher").notNull(),
  message: text("message").notNull(),
});

// ===========================================================================
// 活動記録系（ユーザーが生む動的データ）
// ===========================================================================

/**
 * submissions: 一回の課題提出の記録。ログ系テーブル。
 * リアルタイム進捗は postMessage で流れるが、最終結果はここに永続化する。
 * 追記のみ（UPDATE・DELETE 禁止）。
 */
export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    result: submissionResultEnum("result").notNull(),
    submittedCode: jsonb("submitted_code").notNull(), // Record<filepath, code>
    axisResults: jsonb("axis_results").notNull(),
    degradedTasks: jsonb("degraded_tasks"),
    elapsedMs: integer("elapsed_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("submissions_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
    taskIdx: index("submissions_task_idx").on(t.taskId),
  }),
);

/**
 * taskProgress: 課題ごとの到達状態。users x tasks で一意。
 * submissions が「履歴」なのに対し、これは「現在地」を表す。
 */
export const taskProgress = pgTable(
  "task_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    isCleared: boolean("is_cleared").notNull().default(false),
    attemptCount: integer("attempt_count").notNull().default(0),
    firstClearedAt: timestamp("first_cleared_at", { withTimezone: true }),
    workingCode: jsonb("working_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userTaskUnique: unique().on(t.userId, t.taskId),
    userIdx: index("task_progress_user_idx").on(t.userId),
  }),
);

// ===========================================================================
// 他者性・ゲーム性
// ===========================================================================

/**
 * encouragementMessages: 並走者へ送る応援メッセージ。
 * 本文は自由記述ではなく固定文の番号で持つ。
 * システムが文面の優しさを保証するため、本文文字列は DB に置かない。
 */
export const encouragementMessages = pgTable(
  "encouragement_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    presetKey: text("preset_key").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    recipientIdx: index("encouragement_recipient_idx").on(t.recipientId),
  }),
);

/**
 * dailyBonuses: ログインボーナスの受領記録。ログ系テーブル。
 * 1ユーザー1日1件。追記のみ（UPDATE・DELETE 禁止）。
 */
export const dailyBonuses = pgTable(
  "daily_bonuses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grantedOn: text("granted_on").notNull(), // 'YYYY-MM-DD'
    reward: jsonb("reward").notNull(),
  },
  (t) => ({
    userDayUnique: unique().on(t.userId, t.grantedOn),
  }),
);

/**
 * skipTickets: 課題スキップ券。ガチャの低確率枠で入手する消費アイテム。
 * Cosmetic（背景・アイコン・音）とは性質が異なるため別テーブルで持つ。
 *
 * 1 行 = 1 枚。所持中（未使用）は usedAt が null。ガチャの出現制御に使う:
 *  - 未使用の券を所持していれば再出現させない
 *  - 直近の使用から 3 ヶ月は再出現させない
 * usedAt は「消費の確定」を表す 1 回限りの更新で、それ以外の更新はしない。
 */
export const skipTickets = pgTable(
  "skip_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acquiredAt: timestamp("acquired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** 使用日時。null は未使用（所持中）。使用した課題を usedTaskId に残す。 */
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedTaskId: uuid("used_task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
  },
  (t) => ({
    userIdx: index("skip_tickets_user_idx").on(t.userId),
  }),
);

// ===========================================================================
// 自己表現（Cosmetic）— 学習系と独立
// ===========================================================================

/**
 * cosmeticItems: アンロック可能な装飾アイテムのカタログ。
 * coinCost が null なら、コインでは買えず課題/コース完走でのみ入手可能。
 */
export const cosmeticItems = pgTable("cosmetic_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: cosmeticKindEnum("kind").notNull(),
  name: text("name").notNull(),
  assetPath: text("asset_path").notNull(),
  coinCost: integer("coin_cost"),
});

/**
 * userInventory: ユーザーが所有する Cosmetic。
 * source により「どう手に入れたか」を残し、完走記念バッジ的な意味も担う。
 */
export const userInventory = pgTable(
  "user_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => cosmeticItems.id, { onDelete: "cascade" }),
    source: acquisitionSourceEnum("source").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userItemUnique: unique().on(t.userId, t.itemId),
  }),
);

/**
 * userLoadout: 現在装備中の Cosmetic。users と 1対1。
 * 「お気に入りの学習スペース」の現在の構成を表す。
 */
export const userLoadout = pgTable("user_loadout", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  backgroundItemId: uuid("background_item_id").references(
    () => cosmeticItems.id,
  ),
  iconItemId: uuid("icon_item_id").references(() => cosmeticItems.id),
  bgmItemId: uuid("bgm_item_id").references(() => cosmeticItems.id),
  seItemId: uuid("se_item_id").references(() => cosmeticItems.id),
});

// ===========================================================================
// リレーション定義
// ===========================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  loadout: one(userLoadout),
  submissions: many(submissions),
  taskProgress: many(taskProgress),
  inventory: many(userInventory),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  course: one(courses, {
    fields: [tasks.courseId],
    references: [courses.id],
  }),
  testCases: many(testCases),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [submissions.taskId],
    references: [tasks.id],
  }),
}));
