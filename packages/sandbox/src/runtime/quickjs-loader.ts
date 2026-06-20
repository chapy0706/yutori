import { getQuickJS } from "quickjs-emscripten";

/**
 * QuickJS-WASM インスタンスをロードして返す。
 * getQuickJS() は内部でシングルトンを返すため、複数回呼んでも WASM は一度しか初期化されない。
 */
export const loadQuickJS = getQuickJS;
