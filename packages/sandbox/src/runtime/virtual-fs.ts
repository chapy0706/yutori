/**
 * 仮想ファイルシステム。ファイルパス → ソースコード の Map。
 * 過去課題のコードを base として受け取り、提出コードで上書きする。
 * QuickJS のモジュールローダーに渡してファイル解決に使う。
 */
export type VirtualFS = ReadonlyMap<string, string>;

export function buildVirtualFs(
  submittedCode: Record<string, string>,
  previousCode: Record<string, string> = {},
): VirtualFS {
  const fs = new Map<string, string>();
  for (const [path, code] of Object.entries(previousCode)) {
    fs.set(path, code);
  }
  for (const [path, code] of Object.entries(submittedCode)) {
    fs.set(path, code);
  }
  return fs;
}
