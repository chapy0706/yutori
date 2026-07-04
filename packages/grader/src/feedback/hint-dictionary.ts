/**
 * パターンマッチング方式のヒント辞書。
 *
 * エラーの名前・メッセージに対して、答えではなく問いかけの形のヒントを返す
 * (README・design-spec 7.1 の「ヒントは命令形ではなく問いかけ」)。
 * 初期エントリは最小限。テトリスコースの課題作成 (issue-14) で本格的に育てる。
 */
export type HintPattern = {
  match: RegExp;
  hint: string;
};

export const HINT_PATTERNS: readonly HintPattern[] = [
  {
    match: /is not a function/i,
    hint: "呼び出そうとしたものは関数じゃないみたい。export の形を確かめてみようか。",
  },
  {
    match: /is not defined|not defined/i,
    hint: "使っている名前が見つからないみたい。宣言やスペルを見直してみようか。",
  },
  {
    match: /cannot read propert|of undefined|of null/i,
    hint: "値が undefined や null のまま中身を触っていないかな。手前で値が入っているか確かめてみよう。",
  },
  {
    match: /unexpected token|unexpected end|syntax/i,
    hint: "文法のどこかでつまずいているみたい。かっこや記号の対応を見てみようか。",
  },
  {
    match: /module not found|not found in virtual fs/i,
    hint: "import 先のファイルが見つからないみたい。パスやファイル名を確かめてみよう。",
  },
];

/** エラー名・メッセージに一致するヒントを返す。なければ null。 */
export function lookupHint(name: string, message: string): string | null {
  const haystack = `${name}: ${message}`;
  for (const pattern of HINT_PATTERNS) {
    if (pattern.match.test(haystack)) return pattern.hint;
  }
  return null;
}
