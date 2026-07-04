/**
 * 初期構文チェック段階 (design-spec 5.3 の Biome 検査)。
 *
 * grader は純粋な部品であり、Biome CLI (child_process) や Next.js を知らない。
 * そのため lint 自体は Port として外から注入する。MVP では呼び出し元の
 * API Route が Biome CLI を実行してこの Port を満たす (issue-07 技術検討・issue-08)。
 * grader 単体テストではフェイクの Linter を注入して段階の挙動を検証する。
 */
export type LintDiagnostic = {
  message: string;
  file?: string;
  line?: number;
  column?: number;
};

export type LintResult = {
  ok: boolean;
  diagnostics: LintDiagnostic[];
};

export type Linter = (
  code: Record<string, string>,
) => LintResult | Promise<LintResult>;

/**
 * 既定の Linter。構文チェックの実体は呼び出し元 (Biome CLI) に委ねる方針のため、
 * grader 内蔵の既定は常に通過させる。実際の Biome 実行を注入すると段階が働く。
 */
export const noopLinter: Linter = () => ({ ok: true, diagnostics: [] });

/** 構文チェック段階を実行する。 */
export async function runLintStage(
  code: Record<string, string>,
  linter: Linter,
): Promise<LintResult> {
  return linter(code);
}
