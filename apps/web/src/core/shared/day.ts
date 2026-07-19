/**
 * 日付ユーティリティ (UTC の 'YYYY-MM-DD' 文字列を中心に扱う純粋関数)。
 *
 * タイムゾーンやロケールに依存する曖昧さを一箇所に閉じ込める。草・連続日数・
 * デイリーボーナスなど「1 日」を単位に数える箇所で共通に使う。
 */

/** Date を 'YYYY-MM-DD' (UTC) に落とす。 */
export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' に delta 日を加算した 'YYYY-MM-DD' を返す。 */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** fromDay から toDay までの日数差 (toDay が後なら正)。 */
export function diffDays(fromDay: string, toDay: string): number {
  const a = Date.parse(`${fromDay}T00:00:00.000Z`);
  const b = Date.parse(`${toDay}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}
