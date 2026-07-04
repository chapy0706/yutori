import { z } from "zod";

/**
 * Zod スキーマの JSON 表現 (スキーマ記述子)。
 *
 * ADR-0004 に従い、課題の仕様は Zod スキーマで記述する。ただし仕様は DB の
 * jsonb カラムに保存されるため、Zod スキーマそのものではなく「Zod に変換できる
 * 最小の JSON 記述子」として持つ。この記述子を toZod で実行時に Zod へ復元し、
 * 実際の値の適合判定に用いる。
 *
 * 記述子は最小限で始め、課題作成 (issue-14) で必要になった型を足していく。
 */
export type SchemaDescriptor =
  | { type: "unknown" }
  | { type: "any" }
  | { type: "null" }
  | { type: "boolean" }
  | {
      type: "string";
      min?: number;
      max?: number;
      uuid?: boolean;
      regex?: string;
    }
  | { type: "number"; int?: boolean; min?: number; max?: number }
  | { type: "array"; items?: SchemaDescriptor; min?: number; max?: number }
  | {
      type: "object";
      shape?: Record<string, SchemaDescriptor>;
      passthrough?: boolean;
    }
  | { type: "tuple"; items: SchemaDescriptor[] };

/**
 * 境界 (DB 由来の unknown) を検証するための Zod スキーマ。
 * 記述子自体が信頼できない入力であるため、解釈前に必ず parse する。
 */
export const SchemaDescriptorSchema: z.ZodType<SchemaDescriptor> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal("unknown") }),
    z.object({ type: z.literal("any") }),
    z.object({ type: z.literal("null") }),
    z.object({ type: z.literal("boolean") }),
    z.object({
      type: z.literal("string"),
      min: z.number().optional(),
      max: z.number().optional(),
      uuid: z.boolean().optional(),
      regex: z.string().optional(),
    }),
    z.object({
      type: z.literal("number"),
      int: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    }),
    z.object({
      type: z.literal("array"),
      items: SchemaDescriptorSchema.optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    }),
    z.object({
      type: z.literal("object"),
      shape: z.record(z.string(), SchemaDescriptorSchema).optional(),
      passthrough: z.boolean().optional(),
    }),
    z.object({
      type: z.literal("tuple"),
      items: z.array(SchemaDescriptorSchema),
    }),
  ]),
);

function build(descriptor: SchemaDescriptor): z.ZodTypeAny {
  switch (descriptor.type) {
    case "unknown":
      return z.unknown();
    case "any":
      return z.any();
    case "null":
      return z.null();
    case "boolean":
      return z.boolean();
    case "string": {
      let schema = z.string();
      if (descriptor.min !== undefined) schema = schema.min(descriptor.min);
      if (descriptor.max !== undefined) schema = schema.max(descriptor.max);
      if (descriptor.uuid) schema = schema.uuid();
      if (descriptor.regex) schema = schema.regex(new RegExp(descriptor.regex));
      return schema;
    }
    case "number": {
      let schema = z.number();
      if (descriptor.int) schema = schema.int();
      if (descriptor.min !== undefined) schema = schema.min(descriptor.min);
      if (descriptor.max !== undefined) schema = schema.max(descriptor.max);
      return schema;
    }
    case "array": {
      const items = descriptor.items ? build(descriptor.items) : z.unknown();
      let schema = z.array(items);
      if (descriptor.min !== undefined) schema = schema.min(descriptor.min);
      if (descriptor.max !== undefined) schema = schema.max(descriptor.max);
      return schema;
    }
    case "object": {
      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, value] of Object.entries(descriptor.shape ?? {})) {
        shape[key] = build(value);
      }
      const schema = z.object(shape);
      return descriptor.passthrough ? schema.passthrough() : schema;
    }
    case "tuple": {
      const items = descriptor.items.map(build);
      // z.tuple は最低 1 要素の可変長タプルを要求するため型を明示する
      return z.tuple(items as [z.ZodTypeAny, ...z.ZodTypeAny[]]);
    }
  }
}

/**
 * JSON スキーマ記述子を Zod スキーマへ復元する。
 * 記述子が不正な場合は parse 段階で例外を投げる (呼び出し側で採点エラーへ変換)。
 */
export function toZod(descriptor: unknown): z.ZodTypeAny {
  const parsed = SchemaDescriptorSchema.parse(descriptor);
  return build(parsed);
}

export type SchemaMatch =
  | { ok: true; error: null }
  | { ok: false; error: z.ZodError };

/** 実際の値を記述子へ適合判定する。値一致ではなく型・構造の適合を見る。 */
export function matchSchema(actual: unknown, descriptor: unknown): SchemaMatch {
  const schema = toZod(descriptor);
  const result = schema.safeParse(actual);
  if (result.success) return { ok: true, error: null };
  return { ok: false, error: result.error };
}
