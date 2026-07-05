"use client";

import type {
  Course,
  GradingInput,
  GradingOutput,
  Task,
  TestCase,
} from "@yutori/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CodeEditor } from "@/ui/components/editor/code-editor";
import { AxisProgress } from "@/ui/components/grading/axis-progress";
import { ResultPanel } from "@/ui/components/grading/result-panel";
import { GoalMedia } from "@/ui/components/task/goal-media";
import { useGrading } from "@/ui/hooks/use-grading";

export type TaskWorkspaceProps = {
  course: Course;
  task: Task;
  testCases: TestCase[];
  previousTasks: Task[];
  previousReferenceImpls: Record<string, Record<string, string>>;
  /** 復元する作業中コード。未着手なら null。 */
  workingCode: Record<string, string> | null;
};

type MobileTab = "task" | "code" | "result";

function starterFor(path: string): string {
  return `// ${path}\n`;
}

/**
 * 課題ページの中核クライアントコンポーネント。
 * エディタ・採点実行 (Worker)・リアルタイム進捗・リザルトを束ね、
 * レスポンシブに PC 左右分割 / スマホタブ切り替えで見せる。
 */
export function TaskWorkspace({
  task,
  testCases,
  previousTasks,
  previousReferenceImpls,
  workingCode,
}: TaskWorkspaceProps) {
  const initialFiles = useMemo(() => {
    const files: Record<string, string> = {};
    for (const path of task.targetFiles) {
      files[path] = workingCode?.[path] ?? starterFor(path);
    }
    return files;
  }, [task.targetFiles, workingCode]);

  const [files, setFiles] = useState<Record<string, string>>(initialFiles);
  const [activeFile, setActiveFile] = useState<string>(
    task.targetFiles[0] ?? "",
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>("task");
  const [notice, setNotice] = useState<string | null>(null);

  const filesRef = useRef(files);
  filesRef.current = files;

  const { state, run } = useGrading();

  const updateFile = useCallback((path: string, value: string) => {
    setFiles((prev) => ({ ...prev, [path]: value }));
  }, []);

  const submit = useCallback(() => {
    const input: GradingInput = {
      taskId: task.id,
      submittedCode: filesRef.current,
      previousTasks,
      previousReferenceImpls,
    };
    setNotice(null);
    setMobileTab("result");
    run({ task, testCases, input });
  }, [task, testCases, previousTasks, previousReferenceImpls, run]);

  // 採点完了時に一度だけ結果を永続化する。
  const persistedRef = useRef<GradingOutput | null>(null);
  useEffect(() => {
    const output = state.output;
    if (state.phase !== "done" || output === null) return;
    if (persistedRef.current === output) return;
    persistedRef.current = output;
    void persistSubmission(task.id, filesRef.current, output).then(
      (message) => {
        if (message !== null) setNotice(message);
      },
    );
  }, [state.phase, state.output, task.id]);

  // 作業中コードの自動保存 (デバウンス)。初回マウント分は保存しない。
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const snapshot = files;
    const timer = setTimeout(() => {
      void saveWorkingCode(task.id, snapshot, false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [files, task.id]);

  // 離脱時に作業中コードを保存する。
  useEffect(() => {
    const handler = () => {
      void saveWorkingCode(task.id, filesRef.current, true);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [task.id]);

  const grading = state.phase === "grading";

  return (
    <div className="space-y-4">
      <MobileTabs active={mobileTab} onChange={setMobileTab} />

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        {/* 左: 課題説明・ゴール・進捗・結果 */}
        <div className="space-y-6">
          <Panel show={mobileTab === "task"}>
            <section className="space-y-2">
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {task.title}
              </h1>
              <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                {task.description}
              </p>
            </section>
            <GoalMedia goalMediaPath={task.goalMediaPath} title={task.title} />
          </Panel>

          <Panel show={mobileTab === "result"}>
            <AxisProgress axes={state.axes} phase={state.phase} />
            {state.phase === "done" && state.output !== null && (
              <div className="mt-4">
                <ResultPanel output={state.output} />
              </div>
            )}
            {state.phase === "error" && (
              <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {state.errorMessage}
              </p>
            )}
            {notice !== null && (
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                {notice}
              </p>
            )}
          </Panel>
        </div>

        {/* 右: エディタ・提出 */}
        <Panel show={mobileTab === "code"}>
          <div className="flex h-full flex-col gap-3">
            {task.targetFiles.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {task.targetFiles.map((path) => (
                  <button
                    type="button"
                    key={path}
                    onClick={() => setActiveFile(path)}
                    className={`rounded-md px-3 py-1 text-xs ${
                      path === activeFile
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                        : "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {path}
                  </button>
                ))}
              </div>
            )}
            <div className="min-h-64 flex-1">
              <CodeEditor
                key={activeFile}
                initialValue={files[activeFile] ?? ""}
                onChange={(value) => updateFile(activeFile, value)}
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={grading}
              className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {grading ? "採点中…" : "提出して採点する"}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${show ? "block" : "hidden"} space-y-6 lg:block`}>
      {children}
    </div>
  );
}

function MobileTabs({
  active,
  onChange,
}: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
}) {
  const tabs: { key: MobileTab; label: string }[] = [
    { key: "task", label: "課題" },
    { key: "code", label: "コード" },
    { key: "result", label: "結果" },
  ];
  return (
    <div
      role="tablist"
      className="flex gap-1 rounded-md border border-neutral-200 p-1 lg:hidden dark:border-neutral-800"
    >
      {tabs.map((tab) => (
        <button
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 rounded px-3 py-1.5 text-sm ${
            active === tab.key
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "text-neutral-600 dark:text-neutral-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** 採点結果を永続化する。ログイン等で保存できない場合はユーザー向け文言を返す。 */
async function persistSubmission(
  taskId: string,
  submittedCode: Record<string, string>,
  output: GradingOutput,
): Promise<string | null> {
  try {
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId, submittedCode, output }),
    });
    if (response.status === 401) {
      return "結果の保存にはログインが必要だよ（採点結果はそのまま見られるよ）。";
    }
    if (!response.ok) {
      return "結果の保存に失敗したよ。採点結果はそのまま見られるよ。";
    }
    return null;
  } catch {
    return "結果の保存に失敗したよ。採点結果はそのまま見られるよ。";
  }
}

/** 作業中コードを保存する。beacon=true では離脱時用に sendBeacon を使う。 */
async function saveWorkingCode(
  taskId: string,
  workingCode: Record<string, string>,
  beacon: boolean,
): Promise<void> {
  const body = JSON.stringify({ taskId, workingCode });
  if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/task-progress",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }
  try {
    await fetch("/api/task-progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // 自動保存の失敗は致命的でないため握りつぶす。
  }
}
