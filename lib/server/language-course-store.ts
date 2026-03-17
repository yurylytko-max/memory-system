import "server-only";

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  importedCourseSchema,
  importJobSchema,
  type ImportedCourse,
  type ImportJob,
} from "@/lib/language-course";

const DATA_DIR = join(process.cwd(), ".data", "language-import");
const JOBS_PATH = join(DATA_DIR, "jobs.json");
const COURSES_PATH = join(DATA_DIR, "courses.json");
const JOB_FILES_DIR = join(DATA_DIR, "jobs");

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(path: string, data: unknown) {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

function sortByUpdatedAt<T extends { updatedAt?: string; importedAt?: string }>(
  items: T[]
) {
  return [...items].sort((left, right) => {
    const leftDate = left.updatedAt ?? left.importedAt ?? "";
    const rightDate = right.updatedAt ?? right.importedAt ?? "";
    return rightDate.localeCompare(leftDate);
  });
}

export async function readImportJobs(): Promise<ImportJob[]> {
  const raw = await readJsonFile<unknown[]>(JOBS_PATH, []);

  return sortByUpdatedAt(
    raw.flatMap((item) => {
      const parsed = importJobSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
  );
}

export async function writeImportJobs(jobs: ImportJob[]) {
  await writeJsonFile(JOBS_PATH, jobs);
}

export async function readImportJob(jobId: string) {
  const jobs = await readImportJobs();
  return jobs.find((job) => job.id === jobId) ?? null;
}

export async function upsertImportJob(job: ImportJob) {
  const jobs = await readImportJobs();
  const index = jobs.findIndex((item) => item.id === job.id);
  const nextJobs = [...jobs];

  if (index === -1) {
    nextJobs.push(job);
  } else {
    nextJobs[index] = job;
  }

  await writeImportJobs(sortByUpdatedAt(nextJobs));
}

export async function readCourses(): Promise<ImportedCourse[]> {
  const raw = await readJsonFile<unknown[]>(COURSES_PATH, []);

  return sortByUpdatedAt(
    raw.flatMap((item) => {
      const parsed = importedCourseSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
  );
}

export async function writeCourses(courses: ImportedCourse[]) {
  await writeJsonFile(COURSES_PATH, courses);
}

export async function readCourse(courseId: string) {
  const courses = await readCourses();
  return courses.find((course) => course.id === courseId) ?? null;
}

export async function upsertCourse(course: ImportedCourse) {
  const courses = await readCourses();
  const index = courses.findIndex((item) => item.id === course.id);
  const nextCourses = [...courses];

  if (index === -1) {
    nextCourses.push(course);
  } else {
    nextCourses[index] = course;
  }

  await writeCourses(sortByUpdatedAt(nextCourses));
}

export async function getLatestCourse() {
  const courses = await readCourses();
  return courses[0] ?? null;
}

export function getJobDirectory(jobId: string) {
  return join(JOB_FILES_DIR, jobId);
}

export function getJobPageImagePath(jobId: string, fileName: string) {
  return join(getJobDirectory(jobId), "pages", fileName);
}

export async function writeJobPageImage(
  jobId: string,
  fileName: string,
  bytes: Uint8Array
) {
  const path = getJobPageImagePath(jobId, fileName);
  await ensureDir(dirname(path));
  await writeFile(path, bytes);
}

export async function clearJobFiles(jobId: string) {
  await rm(getJobDirectory(jobId), { recursive: true, force: true });
}

export async function getJobFileNames(jobId: string) {
  try {
    return await readdir(join(getJobDirectory(jobId), "pages"));
  } catch {
    return [];
  }
}
