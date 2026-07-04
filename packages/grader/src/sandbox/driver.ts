/**
 * sandbox 内で実行するドライバコードを生成する。
 *
 * grader はユーザーのエクスポートを直接呼べない (sandbox の内側にいる) ため、
 * 「ユーザーコードを import し、呼び出し、結果を stdout へ JSON で書き出す」
 * 小さなエントリモジュールを生成して sandbox に渡す。grader はその stdout 行を
 * 拾って判定に使う。
 *
 * console.log は sandbox 側で文字列引数をそのまま出力する。マーカー付き 1 行を
 * 生成し、ユーザー自身の出力と区別する。
 */

/**
 * ドライバが結果行に付けるマーカー。ユーザー出力と衝突しにくい純 ASCII 値。
 * QuickJS の console.log は文字列を C 文字列として渡すため、NUL や制御文字は使えない
 * (先頭の NUL があると行全体が切り落とされる)。
 */
export const RESULT_MARKER = "@@YUTORI_GRADER_RESULT@@";

/** sandbox の仮想 FS に注入するドライバのエントリファイル名。 */
export const DRIVER_ENTRY = "__yutori_grader_entry__.js";

function importSpecifier(file: string): string {
  const normalized = file.replace(/^\.?\//, "");
  return `./${normalized}`;
}

/** エクスポートの有無・型・引数個数を報告する (構造観点・契約観点)。 */
export function buildReflectDriver(file: string, exportName: string): string {
  const specifier = JSON.stringify(importSpecifier(file));
  const name = JSON.stringify(exportName);
  return `import * as __ns from ${specifier};
const __target = __ns[${name}];
const __isFunction = typeof __target === "function";
console.log(${JSON.stringify(RESULT_MARKER)} + JSON.stringify({
  present: ${name} in __ns,
  isFunction: __isFunction,
  length: __isFunction ? __target.length : null,
}));`;
}

/**
 * エクスポートを引数付きで呼び出し、戻り値を報告する
 * (契約観点・基本観点・仕様観点・頑健観点)。
 *
 * args は「引数タプル」。配列でない input は単一引数として包む。
 * 同期・非同期のどちらでも Promise でラップして executePendingJobs に解決を委ねる。
 */
export function buildCallDriver(
  file: string,
  exportName: string,
  args: unknown[],
): string {
  const specifier = JSON.stringify(importSpecifier(file));
  const name = JSON.stringify(exportName);
  const marker = JSON.stringify(RESULT_MARKER);
  const argsJson = JSON.stringify(args);
  return `import * as __ns from ${specifier};
const __target = __ns[${name}];
if (typeof __target !== "function") {
  console.log(${marker} + JSON.stringify({ ok: false, notFunction: true }));
} else {
  const __args = ${argsJson};
  Promise.resolve()
    .then(() => __target(...__args))
    .then((__value) => {
      console.log(${marker} + JSON.stringify({
        ok: true,
        undefinedResult: __value === undefined,
        value: __value === undefined ? null : __value,
      }));
    })
    .catch((__err) => {
      console.log(${marker} + JSON.stringify({
        ok: false,
        threw: true,
        name: (__err && __err.name) ? String(__err.name) : "Error",
        message: (__err && __err.message !== undefined) ? String(__err.message) : String(__err),
      }));
    });
}`;
}

/** input を引数タプルへ正規化する。配列はそのまま、それ以外は単一引数とみなす。 */
export function toArgs(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [input];
}
