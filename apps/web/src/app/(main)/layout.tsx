import type { ReactNode } from "react";

/**
 * 認証後の共通レイアウト。いまは薄いコンテナのみを担う。
 * ナビゲーション・草・応援などは後続 issue で足していく。
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6">
      {children}
    </div>
  );
}
