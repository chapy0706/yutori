"use client";

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { useEffect, useRef } from "react";

/**
 * CodeMirror 6 のコードエディタ。
 *
 * 必要な拡張だけを組み立てる (issue-08 技術検討)。初期は シンタックスハイライト +
 * 行番号 + 自動インデント + 括弧対応表示 + 履歴 に絞る。ファイルを切り替えるときは
 * 親が key を変えて再マウントする前提で、初期化は一度だけ行う。
 */
export function CodeEditor({
  initialValue,
  onChange,
  editable = true,
}: {
  initialValue: string;
  onChange: (value: string) => void;
  editable?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 初期化はマウント時のみ。initialValue / editable の変更は親が key 再マウントで扱う。
  // biome-ignore lint/correctness/useExhaustiveDependencies: マウント時のみ初期化する
  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          javascript({ typescript: true }),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.editable.of(editable),
          EditorState.readOnly.of(!editable),
          EditorView.theme({
            "&": { fontSize: "14px", height: "100%" },
            ".cm-scroller": {
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              minHeight: "16rem",
            },
            "&.cm-focused": { outline: "none" },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
    });

    return () => view.destroy();
  }, []);

  return (
    <div
      ref={hostRef}
      className="h-full overflow-auto rounded-md border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
    />
  );
}
