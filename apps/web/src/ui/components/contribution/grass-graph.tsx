import type { Contribution, GrassCell } from "@/core/learning/progress-service";

/**
 * 草 (コントリビューショングラフ)。
 *
 * 提出のあった日を緑の濃淡で並べ、見出しにクリア課題のユニーク数と
 * 連続学習日数を出す。焦らせない設計 (ADR-0006) に沿い、空白日を責める
 * 表現はしない (薄い枠のマスとして静かに置くだけ)。
 * スマホでは横スクロールで収める。
 */

/** 提出数を 0/低/中/高 の 4 段階の濃淡に落とす。 */
function levelClass(count: number): string {
  if (count <= 0) {
    return "bg-neutral-100 dark:bg-neutral-800";
  }
  if (count <= 2) {
    return "bg-emerald-200 dark:bg-emerald-900";
  }
  if (count <= 4) {
    return "bg-emerald-400 dark:bg-emerald-700";
  }
  return "bg-emerald-600 dark:bg-emerald-500";
}

/** 'YYYY-MM-DD' の曜日 (0=日) を UTC で求める。 */
function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00.000Z`).getUTCDay();
}

/** 草の 1 マス。cell が null なら曜日そろえのための空きマス。id は描画キー。 */
type Slot = { id: string; cell: GrassCell | null };
type Week = { id: string; slots: Slot[] };

/** セル列を曜日でそろえた週 (7 マス) の配列に畳む。先頭は空きマスで詰める。 */
function toWeeks(cells: GrassCell[]): Week[] {
  if (cells.length === 0) return [];

  const slots: Slot[] = [];
  const leading = weekdayOf(cells[0].day);
  for (let i = 0; i < leading; i += 1) {
    slots.push({ id: `pad-lead-${i}`, cell: null });
  }
  for (const cell of cells) {
    slots.push({ id: cell.day, cell });
  }

  const weeks: Week[] = [];
  for (let i = 0; i < slots.length; i += 7) {
    const chunk = slots.slice(i, i + 7);
    while (chunk.length < 7) {
      chunk.push({ id: `pad-tail-${i}-${chunk.length}`, cell: null });
    }
    weeks.push({ id: chunk[0].id, slots: chunk });
  }
  return weeks;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
        {value}
      </span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
    </div>
  );
}

export function GrassGraph({ contribution }: { contribution: Contribution }) {
  const weeks = toWeeks(contribution.cells);

  return (
    <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-end gap-6">
        <Stat
          label="クリアした課題"
          value={`${contribution.uniqueClearedTasks}`}
        />
        <Stat label="連続学習日数" value={`${contribution.currentStreak}日`} />
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((week) => (
            <div key={week.id} className="flex flex-col gap-1">
              {week.slots.map((slot) =>
                slot.cell === null ? (
                  <div key={slot.id} className="h-3 w-3" />
                ) : (
                  <div
                    key={slot.id}
                    title={`${slot.cell.day}: ${slot.cell.count} 回`}
                    className={`h-3 w-3 rounded-sm ${levelClass(slot.cell.count)}`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
