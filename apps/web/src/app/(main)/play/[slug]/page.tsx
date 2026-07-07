import Link from "next/link";
import { notFound } from "next/navigation";

import { getCourseRepository } from "@/infra/repositories";
import { PlayFrame } from "@/ui/components/course/play-frame";

/**
 * ゲームプレイ画面。コースの模範実装 (リファレンスビルド) を読み込んで遊ぶ。
 * ロック中のコースでもアクセスできる (見る・遊ぶ権利は常に開いている)。
 */
export default async function PlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseRepository().findCourseBySlug(slug);
  if (course === null) notFound();

  return (
    <div className="space-y-4">
      <Link
        href={`/courses/${course.slug}`}
        className="text-sm text-neutral-500 hover:underline dark:text-neutral-400"
      >
        コースへ戻る
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {course.title} を遊ぶ
      </h1>
      <PlayFrame buildPath={course.playableBuildPath} title={course.title} />
    </div>
  );
}
