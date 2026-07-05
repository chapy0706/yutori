import type { TestAxis } from "@yutori/contracts";

/** 観点の確認順 (grader のチェックポイント順と一致させる)。 */
export const AXIS_ORDER: readonly TestAxis[] = [
  "structure",
  "contract",
  "basic",
  "spec",
  "robustness",
];

/** 観点の表示名と一行説明。UI の表記を一箇所に集約する。 */
export const AXIS_META: Record<TestAxis, { label: string; summary: string }> = {
  structure: { label: "構造", summary: "エクスポートがあるか" },
  contract: { label: "契約", summary: "引数と戻り値の型が合っているか" },
  basic: { label: "基本", summary: "単純な入力で動くか" },
  spec: { label: "仕様", summary: "仕様の型・構造に合っているか" },
  robustness: { label: "頑健", summary: "不正・空の入力でも落ちないか" },
};
