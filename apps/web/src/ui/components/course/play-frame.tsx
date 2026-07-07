/**
 * ゲームプレイ画面の埋め込み。
 *
 * courses.playableBuildPath (public/ 配下のビルド済み成果物) を iframe で読み込む。
 * ロック中のコースでも遊べる (ロックされるのは作る権利だけ)。ビルドが未用意なら
 * 準備中の案内を出す。
 */
export function PlayFrame({
  buildPath,
  title,
}: {
  buildPath: string | null;
  title: string;
}) {
  if (buildPath === null) {
    return (
      <div className="rounded-md border border-dashed border-neutral-300 px-4 py-16 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        このゲームのプレイビルドは準備中だよ。完成すると、ここで遊べるようになるよ。
      </div>
    );
  }
  return (
    <iframe
      src={buildPath}
      title={`${title} をプレイ`}
      className="h-[70vh] w-full rounded-md border border-neutral-200 bg-black dark:border-neutral-800"
    />
  );
}
