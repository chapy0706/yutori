import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 認証後の共通レイアウト。上部に最小限のナビゲーションを置く。
 * 草・応援などの表示はダッシュボード (issue-10) が担う。
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6">
      <nav className="mb-6 flex items-center gap-4 text-sm">
        <Link
          href="/dashboard"
          className="font-medium text-neutral-700 transition hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
        >
          ホーム
        </Link>
        <Link
          href="/courses"
          className="font-medium text-neutral-700 transition hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
        >
          コース
        </Link>
      </nav>
      {children}
    </div>
  );
}
