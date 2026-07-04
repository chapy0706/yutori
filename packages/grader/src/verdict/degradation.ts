import type { Task } from "@yutori/contracts";

import { reflectExport } from "../sandbox/invoke";
import type { SandboxRunner } from "../sandbox/runner";
import { parseContract } from "../spec/contract-descriptor";

/**
 * 過去課題の整合性チェックと模範実装への差し替え (design-spec 6.1 の優雅な劣化)。
 *
 * 現在の提出コードには積み上げてきた過去課題のファイルも含まれる。各過去課題の
 * 契約 (エクスポートの有無・関数性・引数個数) を確認し、壊れていれば当該課題の
 * 模範実装で差し替える。これにより過去課題のリグレッションが新規課題の採点を
 * 巻き添えにしない。ただし「壊れている」事実は degradedTasks として隠さず返す。
 *
 * ログ系テーブルには触れない純粋な計算であり、副作用は持たない。
 */
export type DegradationOutcome = {
  /** 退化課題を模範実装で差し替えた後の実効コード。 */
  effectiveCode: Record<string, string>;
  /** 差し替えた過去課題の ID。差し替えがなければ null。 */
  degradedTasks: string[] | null;
};

export type DegradationInput = {
  sandbox: SandboxRunner;
  submittedCode: Record<string, string>;
  previousTasks: Task[];
  previousReferenceImpls: Record<string, Record<string, string>>;
  timeBudgetMs: number;
};

async function isIntact(
  input: DegradationInput,
  task: Task,
  code: Record<string, string>,
): Promise<boolean> {
  let contract: ReturnType<typeof parseContract>;
  try {
    contract = parseContract(task.contractSchema);
  } catch {
    // 契約を解釈できない過去課題は整合性を判定できない。差し替えはしない。
    return true;
  }

  const file = contract.file ?? task.targetFiles[0];
  if (file === undefined) return true;

  const reflect = await reflectExport({
    sandbox: input.sandbox,
    taskId: task.id,
    timeBudgetMs: input.timeBudgetMs,
    code,
    file,
    exportName: contract.export,
  });

  if (reflect.error !== null || reflect.timedOut) return false;
  if (!reflect.present || !reflect.isFunction) return false;
  if (
    contract.params !== undefined &&
    reflect.length !== contract.params.length
  ) {
    return false;
  }
  return true;
}

export async function checkDegradation(
  input: DegradationInput,
): Promise<DegradationOutcome> {
  let effectiveCode: Record<string, string> = { ...input.submittedCode };
  const degradedTasks: string[] = [];

  // orderIndex 昇順で確認する (積み上げの下の層から)。
  const tasks = [...input.previousTasks].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  for (const task of tasks) {
    const intact = await isIntact(input, task, effectiveCode);
    if (intact) continue;

    degradedTasks.push(task.id);
    const referenceImpl = input.previousReferenceImpls[task.id];
    if (referenceImpl !== undefined) {
      effectiveCode = { ...effectiveCode, ...referenceImpl };
    }
  }

  return {
    effectiveCode,
    degradedTasks: degradedTasks.length > 0 ? degradedTasks : null,
  };
}
