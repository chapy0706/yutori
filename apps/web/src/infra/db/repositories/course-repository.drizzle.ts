import {
  type Course,
  CourseSchema,
  type Task,
  TaskSchema,
  type TestCase,
  TestCaseSchema,
} from "@yutori/contracts";
import { and, asc, eq, lt } from "drizzle-orm";

import type { CourseRepository } from "@/core/ports/course-repository";
import { getDb } from "@/infra/db/client";
import { courses, tasks, testCases } from "@/infra/db/schema";

/**
 * Drizzle 実装の CourseRepository。
 *
 * jsonb カラム (targetFiles / contractSchema / referenceImpl / payload) は
 * DB 上は不透明な塊であり型の保証がない。境界として contracts の Zod スキーマで
 * parse してからドメイン型として扱う (型の嘘を通さない)。
 */
export class DrizzleCourseRepository implements CourseRepository {
  async listCourses(): Promise<Course[]> {
    const rows = await getDb()
      .select()
      .from(courses)
      .where(eq(courses.isPublished, true))
      .orderBy(asc(courses.orderIndex));
    return rows.map((row) => CourseSchema.parse(row));
  }

  async findCourseBySlug(slug: string): Promise<Course | null> {
    const rows = await getDb()
      .select()
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : CourseSchema.parse(row);
  }

  async findTask(courseId: string, taskId: string): Promise<Task | null> {
    const rows = await getDb()
      .select()
      .from(tasks)
      .where(and(eq(tasks.courseId, courseId), eq(tasks.id, taskId)))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : TaskSchema.parse(row);
  }

  async listTasks(courseId: string): Promise<Task[]> {
    const rows = await getDb()
      .select()
      .from(tasks)
      .where(eq(tasks.courseId, courseId))
      .orderBy(asc(tasks.orderIndex));
    return rows.map((row) => TaskSchema.parse(row));
  }

  async findTestCases(taskId: string): Promise<TestCase[]> {
    const rows = await getDb()
      .select()
      .from(testCases)
      .where(eq(testCases.taskId, taskId))
      .orderBy(asc(testCases.orderIndex));
    return rows.map((row) => TestCaseSchema.parse(row));
  }

  async findPreviousTasks(
    courseId: string,
    orderIndex: number,
  ): Promise<Task[]> {
    const rows = await getDb()
      .select()
      .from(tasks)
      .where(
        and(eq(tasks.courseId, courseId), lt(tasks.orderIndex, orderIndex)),
      )
      .orderBy(asc(tasks.orderIndex));
    return rows.map((row) => TaskSchema.parse(row));
  }
}
