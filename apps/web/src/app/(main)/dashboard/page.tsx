import Link from "next/link";

import { loadDashboardOverview } from "@/core/learning/progress-service";
import { pickPeers } from "@/core/social/peer-service";
import { getViewerUserId } from "@/infra/auth/current-user";
import {
  getDashboardRepository,
  getProfileRepository,
} from "@/infra/repositories";
import { GrassGraph } from "@/ui/components/contribution/grass-graph";
import { ProgressSummary } from "@/ui/components/dashboard/progress-summary";
import { CheerNotice } from "@/ui/components/social/cheer-notice";
import { PeerList } from "@/ui/components/social/peer-list";
import { RankingToggle } from "@/ui/components/social/ranking-toggle";

/**
 * ダッシュボード (ログイン後のホーム)。yutori の「帰ってくる場所」。
 *
 * 草・今週の進捗・並走者・未読応援をまとめて見せる。データ取得と集計は
 * UseCase (progress-service / peer-service) に委ね、この層は薄く保つ。
 * 毎回最新を出すため動的レンダリングにする (集計は閲覧者ごとに変わる)。
 */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getViewerUserId();

  if (userId === null) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          ダッシュボード
        </h1>
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          ログインすると、草や今週の進捗、並走者が見られるよ。
        </p>
        <Link
          href="/courses"
          className="inline-block rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          コースを見る
        </Link>
      </div>
    );
  }

  const dashboard = getDashboardRepository();
  const [overview, showRanking] = await Promise.all([
    loadDashboardOverview(dashboard, userId, new Date()),
    getProfileRepository().getShowRanking(userId),
  ]);

  const peers = showRanking
    ? pickPeers(
        await dashboard.listPeerCandidates(userId),
        overview.viewerClearedCount,
      )
    : [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          おかえり
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          あなたのペースで、少しずつ。今日のようすを置いておくね。
        </p>
      </header>

      <CheerNotice unreadCount={overview.unreadEncouragement} />

      <GrassGraph contribution={overview.contribution} />

      <ProgressSummary weekly={overview.weekly} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            並走者
          </h2>
          <RankingToggle initialOn={showRanking} />
        </div>
        {showRanking ? (
          <PeerList peers={peers} />
        ) : (
          <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            並走者・ランキングは非表示にしているよ。いつでも戻せる。
          </p>
        )}
      </section>
    </div>
  );
}
