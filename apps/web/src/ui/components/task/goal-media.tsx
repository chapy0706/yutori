/**
 * ゴール提示 (design-spec の Level 3: Before/After)。
 *
 * 課題に goalMediaPath があれば完成イメージの WebP を示す。まだ用意がない場合は、
 * 何を目指すのかの手がかりだけを控えめに置く (媒体は issue-14 / media-gen で生成)。
 */
export function GoalMedia({
  goalMediaPath,
  title,
}: {
  goalMediaPath: string | null;
  title: string;
}) {
  return (
    <section aria-label="ゴール" className="space-y-2">
      <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        目指すゴール
      </h2>
      {goalMediaPath !== null ? (
        // 完成形の Before/After イメージ。next/image ではなく素の img で十分。
        <img
          src={goalMediaPath}
          alt={`${title} の完成イメージ`}
          className="w-full rounded-md border border-neutral-200 dark:border-neutral-800"
        />
      ) : (
        <div className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          この課題の完成イメージは準備中だよ。まずは仕様を読んで、手を動かしてみよう。
        </div>
      )}
    </section>
  );
}
