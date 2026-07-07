import type { Course, Task, TestCase } from "@yutori/contracts";

import type { CourseRepository } from "@/core/ports/course-repository";

import {
  FIXTURE_ALL_TEST_CASES,
  FIXTURE_COURSES,
  FIXTURE_TASKS,
} from "./fixtures";

/**
 * content フィクスチャを返す CourseRepository。DB なしで課題ページを動かす。
 */
export class FixtureCourseRepository implements CourseRepository {
  private readonly courses: Course[] = FIXTURE_COURSES;
  private readonly tasks: Task[] = FIXTURE_TASKS;
  private readonly testCases: TestCase[] = FIXTURE_ALL_TEST_CASES;

  async listCourses(): Promise<Course[]> {
    return this.courses
      .filter((course) => course.isPublished)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async findCourseBySlug(slug: string): Promise<Course | null> {
    return this.courses.find((course) => course.slug === slug) ?? null;
  }

  async findTask(courseId: string, taskId: string): Promise<Task | null> {
    return (
      this.tasks.find(
        (task) => task.courseId === courseId && task.id === taskId,
      ) ?? null
    );
  }

  async listTasks(courseId: string): Promise<Task[]> {
    return this.tasks
      .filter((task) => task.courseId === courseId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async findTestCases(taskId: string): Promise<TestCase[]> {
    return this.testCases.filter((testCase) => testCase.taskId === taskId);
  }

  async findPreviousTasks(
    courseId: string,
    orderIndex: number,
  ): Promise<Task[]> {
    return this.tasks
      .filter(
        (task) => task.courseId === courseId && task.orderIndex < orderIndex,
      )
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }
}
