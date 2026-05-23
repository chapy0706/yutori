/**
 * データベーススキーマ定義 (Drizzle ORM / PostgreSQL)
 *
 * 設計方針:
 * 1. コンテンツ系 (Course/Task/TestCase/Hint) と 活動記録系
 *    (Submission/TaskProgress) を別系統として扱う。
 *    前者は運営が作る静的データ、後者はユーザーが生む動的データであり、
 *    変化の速度と所有者が異なるため。
 * 2. テストケース・ヒント・Zod仕様などの「中身」は JSON カラムに格納する。
 *    型は Zod スキーマで保証し、DB は不透明な塊として持つ。
 *    これにより観点の増減などの仕様変更が DB マイグレーションを伴わない。
 * 3. Cosmetic 系は学習系と完全に独立させる。報酬の取得有無が
 *    学習データに一切影響しないことを、スキーマ構造でも表現する。
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// 列挙型
// ---------------------------------------------------------------------------

/** 採点の最終結果。partial は一部観点のみ通過した状態。 */
export const submissionResultEnum = pgEnum("submission_result", [
  "passed",
  "partial",
  "failed",
  "error", // サンドボックス自体の異常など、ユーザー起因でない失敗
]);

/** テストの5観点。順序はこの配列の並びに対応する。 */
export const testAxisEnum = pgEnum("test_axis", [
  "structure", // 構造観点
  "contract", // 契約観点
  "basic", // 基本観点
  "spec", // 仕様観点
  "robustness", // 頑健観点
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
  "coin", // コイン購入
  "task_clear", // 課題クリアによる直接獲得
  "course_clear", // コース完走による直接獲得
]);

// ===========================================================================
// 学習者系
// ===========================================================================

/**
 * users: 認証の主体。
 * 認証情報そのもの (パスワード等) は Supabase Auth が管理するため、
 * このテーブルは Supabase Auth の user id を参照する薄い存在とする。
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Supabase Auth の auth.users.id と一致させる
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * profiles: 学習設定や状態。users と 1対1。
 * users と分けるのは、認証アイデンティティ (不変) と
 * 設定・状態 (可変) の関心を分離するため。
 */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  // 主体性の設定。原則1に基づき、音は両方デフォルト false。
  bgmEnabled: boolean("bgm_enabled").notNull().default(false),
  seEnabled: boolean("se_enabled").notNull().default(false),
  // motion は 'full' | 'reduced' | 'off'。OS設定を初期反映する想定のため
  // アプリ側で解決した結果を保存する。null はOS設定に従う。
  motionPreference: text("motion_preference"),
  // ランキング・並走者の表示可否。比較したい時だけ比較する主体性。
  showRanking: boolean("show_ranking").notNull().default(true),

  // ゲーム性の状態
  coinBalance: integer("coin_balance").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveOn: text("last_active_on"), // 'YYYY-MM-DD' 形式。草・連続日数の判定用
});

// ===========================================================================
// コンテンツ系 (運営が作る静的データ)
// ===========================================================================

/**
 * courses: 一つのゲームを完成させる学習コース。
 * finalSpec は完成形の仕様 (Zod スキーマの定義を JSON 化したもの)。
 */
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(), // URL用の識別子 (例: "tetris")
  title: text("title").notNull(),
  description: text("description").notNull(),
  orderIndex: integer("order_index").notNull(), // コース一覧での並び順

  // このコースをプレイ可能にする (ゴール提示) ためのビルド済み成果物への参照
  playableBuildPath: text("playable_build_path"),

  // 完成形の仕様。Zod スキーマ定義を JSON 化して保持。
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
    orderIndex: integer("order_index").notNull(), // コース内の順序

    title: text("title").notNull(),
    description: text("description").notNull(),

    // この課題で評価対象となるファイル群。理想はファイル単位の課題分割。
    targetFiles: jsonb("target_files").notNull(), // string[]

    // この課題の仕様 = Zod スキーマ定義 (契約観点・仕様観点の判定根拠)
    contractSchema: jsonb("contract_schema").notNull(),

    // 時間制限。何を測るための制限かは description 側に言語化する。
    timeBudgetMs: integer("time_budget_ms").notNull(),

    // Level 3 ゴール提示用。Before/After の WebP への参照。
    goalMediaPath: text("goal_media_path"),

    // ハイブリッド合成用の模範実装。ファイルパスをキーにしたコード片。
    referenceImpl: jsonb("reference_impl").notNull(), // Record<filepath, code>

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // コース内で order は一意。課題の重複・抜けを防ぐ。
    courseOrderUnique: unique().on(t.courseId, t.orderIndex),
    courseIdx: index("tasks_course_idx").on(t.courseId),
  }),
);

/**
 * testCases: 課題のテストケース。観点ごとに複数持てる。
 * テストの「中身」(入力・期待スキーマ・onFailメッセージ) は payload に格納し、
 * 観点が増減しても DB マイグレーションが不要な構造とする。
 */
export const testCases = pgTable(
  "test_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    axis: testAxisEnum("axis").notNull(),
    orderIndex: integer("order_index").notNull(), // 同一観点内での順序

    // テスト実行に必要な定義一式 (入力値、期待Zodスキーマ、onFailヒント等)
    payload: jsonb("payload").notNull(),
  },
  (t) => ({
    taskIdx: index("test_cases_task_idx").on(t.taskId),
  }),
);

/**
 * hints: パターンマッチング方式のヒント辞書。
 * テスト固有ヒントは testCases.payload 内に持つため、ここは
 * エラー型などに対する汎用ヒント (穴埋め用) を担う。
 * courseId が null ならサービス全体で共有する汎用ヒント。
 */
export const hints = pgTable("hints", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  // マッチング条件 (エラー型・メッセージパターン等) と表示文を JSON で持つ
  matcher: jsonb("matcher").notNull(),
  message: text("message").notNull(),
});

// ===========================================================================
// 活動記録系 (ユーザーが生む動的データ)
// ===========================================================================

/**
 * submissions: 一回の課題提出の記録。
 * リアルタイム進捗は postMessage で流れるが、最終結果はここに永続化する。
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

    // 提出時点のユーザーコード一式。完走時の「自分版の作品」生成に使う。
    submittedCode: jsonb("submitted_code").notNull(), // Record<filepath, code>

    // 観点ごとの通過状況。partial の「どこまで通ったか」を表現する。
    axisResults: jsonb("axis_results").notNull(),
    // 過去課題が壊れていて模範実装に差し替えた場合の警告情報
    degradedTasks: jsonb("degraded_tasks"), // taskId[] または null

    elapsedMs: integer("elapsed_ms"), // 採点にかかった時間
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // 草・進捗集計のための複合インデックス
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
 * 集計済みの現在地を別に持つことで、一覧表示で履歴を毎回走査せずに済む。
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

    // ユーザーが編集中のコード (エディタに表示される、ユーザーから見える世界)
    workingCode: jsonb("working_code"), // Record<filepath, code>
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

    // 3種類の固定文のうちどれか。文面そのものはアプリ定数で管理する。
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
 * dailyBonuses: ログインボーナスの受領記録。
 * 1ユーザー1日1件。連続ログイン判定は profiles 側の streak で行い、
 * こちらは「その日に何を受け取ったか」の記録に徹する。
 */
export const dailyBonuses = pgTable(
  "daily_bonuses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grantedOn: text("granted_on").notNull(), // 'YYYY-MM-DD'
    // 付与内容 (コイン量・レアドロップの有無など) を JSON で保持
    reward: jsonb("reward").notNull(),
  },
  (t) => ({
    userDayUnique: unique().on(t.userId, t.grantedOn),
  }),
);

// ===========================================================================
// 自己表現 (Cosmetic) — 学習系と独立
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
  coinCost: integer("coin_cost"), // null = コイン購入不可
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
