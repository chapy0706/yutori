import type { VirtualFS } from "./virtual-fs";

/**
 * QuickJS の setModuleLoader に渡すモジュール解決関数を生成する。
 * 仮想 FS にないモジュールは Error を throw し、QuickJS 側でエラーとして扱われる。
 */
export function createModuleLinker(
  fs: VirtualFS,
): (moduleName: string) => string {
  return (moduleName: string): string => {
    const code = fs.get(moduleName);
    if (code !== undefined) return code;
    throw new Error(`Module not found in virtual FS: ${moduleName}`);
  };
}
