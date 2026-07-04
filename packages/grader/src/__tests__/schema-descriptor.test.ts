import { describe, expect, it } from "vitest";

import { matchSchema, toZod } from "../spec/schema-descriptor";

describe("toZod / matchSchema", () => {
  it("number 記述子は数値のみ通す", () => {
    expect(matchSchema(42, { type: "number" }).ok).toBe(true);
    expect(matchSchema("42", { type: "number" }).ok).toBe(false);
  });

  it("number の int 制約は整数のみ通す", () => {
    expect(matchSchema(3, { type: "number", int: true }).ok).toBe(true);
    expect(matchSchema(3.5, { type: "number", int: true }).ok).toBe(false);
  });

  it("number の min/max を検証する", () => {
    const d = { type: "number", min: 0, max: 10 };
    expect(matchSchema(5, d).ok).toBe(true);
    expect(matchSchema(-1, d).ok).toBe(false);
    expect(matchSchema(11, d).ok).toBe(false);
  });

  it("string の uuid 制約を検証する", () => {
    const d = { type: "string", uuid: true };
    expect(matchSchema("00000000-0000-0000-0000-000000000001", d).ok).toBe(
      true,
    );
    expect(matchSchema("not-a-uuid", d).ok).toBe(false);
  });

  it("array は要素の型まで見る", () => {
    const d = { type: "array", items: { type: "number" } };
    expect(matchSchema([1, 2, 3], d).ok).toBe(true);
    expect(matchSchema([1, "2"], d).ok).toBe(false);
  });

  it("object は shape の型で判定する (値一致ではない)", () => {
    const d = {
      type: "object",
      shape: { x: { type: "number" }, y: { type: "number" } },
    };
    expect(matchSchema({ x: 1, y: 2 }, d).ok).toBe(true);
    expect(matchSchema({ x: 1, y: 2 }, d).ok).toBe(true);
    expect(matchSchema({ x: 1 }, d).ok).toBe(false);
  });

  it("unknown はどんな値も通す", () => {
    expect(matchSchema(undefined, { type: "unknown" }).ok).toBe(true);
    expect(matchSchema({ a: 1 }, { type: "unknown" }).ok).toBe(true);
  });

  it("不正な記述子は例外を投げる", () => {
    expect(() => toZod({})).toThrow();
    expect(() => toZod({ type: "banana" })).toThrow();
  });

  it("失敗時は ZodError を返す", () => {
    const result = matchSchema("x", { type: "number" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.issues.length).toBeGreaterThan(0);
  });
});
