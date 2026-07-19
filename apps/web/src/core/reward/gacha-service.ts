import type { GachaOutcome } from "@yutori/contracts";

import type { OwnableCosmetic } from "@/core/ports/reward-repository";

import { GACHA_CONFIG } from "./gacha-config";

/**
 * ガチャ抽選 (純粋関数)。
 *
 * 日付・DB・乱数源は外から渡す。副作用を持たず、rng を差し替えればテストできる。
 * 確率の動的調整は signals として渡され、この関数は重み付き抽選に徹する。
 */

/** 抽選に効く外的条件 (bonus-service が context と now から導く)。 */
export type GachaSignals = {
  /** 水曜・土曜など、良い枠が上振れる日か。 */
  isBoostDay: boolean;
  /** ログイン頻度が高いか (そっと上げる)。 */
  frequentLogin: boolean;
  /** 久しぶりのログインか (そっと上げる)。 */
  longAbsence: boolean;
};

export type RollGachaInput = {
  signals: GachaSignals;
  /** まだ所持していない Cosmetic。空なら cosmetic 枠は無効化される。 */
  ownableCosmetics: OwnableCosmetic[];
  /** スキップ券を出してよいか (所持中・3 ヶ月制限中は false)。 */
  skipEligible: boolean;
  /** 乱数源 (既定 Math.random)。0 以上 1 未満。 */
  rng?: () => number;
};

type Tier = "coinSmall" | "coinLarge" | "cosmetic" | "skip";

/** 良い枠 (cosmetic / skip) に、条件に応じた控えめな係数を掛ける。 */
function goodTierFactor(signals: GachaSignals): number {
  const { boosts } = GACHA_CONFIG;
  let factor = 1;
  if (signals.isBoostDay) factor *= boosts.weekdayFactor;
  if (signals.frequentLogin) factor *= boosts.frequentFactor;
  if (signals.longAbsence) factor *= boosts.absentFactor;
  return factor;
}

function pickTier(weights: Record<Tier, number>, roll: number): Tier {
  const total =
    weights.coinSmall + weights.coinLarge + weights.cosmetic + weights.skip;
  let cursor = roll * total;
  const order: Tier[] = ["skip", "cosmetic", "coinLarge", "coinSmall"];
  for (const tier of order) {
    cursor -= weights[tier];
    if (cursor < 0) return tier;
  }
  return "coinSmall";
}

export function rollGacha(input: RollGachaInput): GachaOutcome {
  const rng = input.rng ?? Math.random;
  const base = GACHA_CONFIG.baseWeights;
  const factor = goodTierFactor(input.signals);

  const weights: Record<Tier, number> = {
    coinSmall: base.coinSmall,
    coinLarge: base.coinLarge,
    // 未所持の cosmetic が無ければ当てようがないので無効化する。
    cosmetic: input.ownableCosmetics.length > 0 ? base.cosmetic * factor : 0,
    // 出現条件を満たさなければ skip 枠は無効化する。
    skip: input.skipEligible ? base.skip * factor : 0,
  };

  const tier = pickTier(weights, rng());

  switch (tier) {
    case "coinLarge":
      return { kind: "coin", amount: GACHA_CONFIG.coin.large };
    case "cosmetic": {
      const index = Math.floor(rng() * input.ownableCosmetics.length);
      const picked =
        input.ownableCosmetics[
          Math.min(index, input.ownableCosmetics.length - 1)
        ];
      return { kind: "cosmetic", itemId: picked.id, name: picked.name };
    }
    case "skip":
      return { kind: "skip" };
    default:
      return { kind: "coin", amount: GACHA_CONFIG.coin.small };
  }
}
