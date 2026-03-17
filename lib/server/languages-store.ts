import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createClient } from "redis";

import {
  languageCourseSchema,
  languageImportJobSchema,
  languageTutorThreadSchema,
  type LanguageCourse,
  type LanguageImportJob,
  type LanguageTutorThread,
} from "@/lib/languages";

const COURSES_KEY = "languages:courses";
const JOBS_KEY = "languages:jobs";
const THREADS_KEY = "languages:threads";
const DATA_DIR = join(process.cwd(), ".data", "languages");
const COURSES_PATH = join(DATA_DIR, "courses.json");
const JOBS_PATH = join(DATA_DIR, "jobs.json");
const THREADS_PATH = join(DATA_DIR, "threads.json");

declare global {
  var __languagesRedisClient: ReturnType<typeof createClient> | undefined;
}

function getRedisUrl() {
  return process.env.REDIS_URL;
}

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

async function getClient() {
  const url = getRedisUrl();

  if (!url) {
    return null;
  }

  if (!global.__languagesRedisClient) {
    global.__languagesRedisClient = createClient({ url });
    global.__languagesRedisClient.on("error", (error) => {
      console.error("Languages Redis client error:", error);
    });
  }

  if (!global.__languagesRedisClient.isOpen) {
    await global.__languagesRedisClient.connect();
  }

  return global.__languagesRedisClient;
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

async function readCollection<T>(key: string, fallbackPath: string): Promise<T[]> {
  try {
    const client = await getClient();

    if (!client) {
      return await readJsonFile<T[]>(fallbackPath, []);
    }

    const raw = await client.get(key);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return await readJsonFile<T[]>(fallbackPath, []);
  }
}

async function writeCollection(key: string, fallbackPath: string, data: unknown[]) {
  try {
    const client = await getClient();

    if (!client) {
      await writeJsonFile(fallbackPath, data);
      return;
    }

    await client.set(key, JSON.stringify(data));
  } catch {
    await writeJsonFile(fallbackPath, data);
  }
}

export async function readLanguageCourses(): Promise<LanguageCourse[]> {
  const raw = await readCollection<unknown>(COURSES_KEY, COURSES_PATH);
  return sortByUpdatedAt(
    raw.flatMap((item) => {
      const parsed = languageCourseSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
  );
}

export async function readLanguageCourse(courseId: string) {
  const courses = await readLanguageCourses();
  return courses.find((course) => course.id === courseId) ?? null;
}

export async function writeLanguageCourses(courses: LanguageCourse[]) {
  await writeCollection(COURSES_KEY, COURSES_PATH, courses);
}

export async function upsertLanguageCourse(course: LanguageCourse) {
  const courses = await readLanguageCourses();
  const index = courses.findIndex((item) => item.id === course.id);
  const next = [...courses];

  if (index === -1) {
    next.push(course);
  } else {
    next[index] = course;
  }

  await writeLanguageCourses(sortByUpdatedAt(next));
}

export async function readLanguageImportJobs(): Promise<LanguageImportJob[]> {
  const raw = await readCollection<unknown>(JOBS_KEY, JOBS_PATH);
  return sortByUpdatedAt(
    raw.flatMap((item) => {
      const parsed = languageImportJobSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
  );
}

export async function readLanguageImportJob(jobId: string) {
  const jobs = await readLanguageImportJobs();
  return jobs.find((job) => job.id === jobId) ?? null;
}

export async function writeLanguageImportJobs(jobs: LanguageImportJob[]) {
  await writeCollection(JOBS_KEY, JOBS_PATH, jobs);
}

export async function upsertLanguageImportJob(job: LanguageImportJob) {
  const jobs = await readLanguageImportJobs();
  const index = jobs.findIndex((item) => item.id === job.id);
  const next = [...jobs];

  if (index === -1) {
    next.push(job);
  } else {
    next[index] = job;
  }

  await writeLanguageImportJobs(sortByUpdatedAt(next));
}

export async function readLanguageTutorThreads(): Promise<LanguageTutorThread[]> {
  const raw = await readCollection<unknown>(THREADS_KEY, THREADS_PATH);
  return raw.flatMap((item) => {
    const parsed = languageTutorThreadSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function readLanguageTutorThread(threadId: string) {
  const threads = await readLanguageTutorThreads();
  return threads.find((thread) => thread.id === threadId) ?? null;
}

export async function upsertLanguageTutorThread(thread: LanguageTutorThread) {
  const threads = await readLanguageTutorThreads();
  const index = threads.findIndex((item) => item.id === thread.id);
  const next = [...threads];

  if (index === -1) {
    next.push(thread);
  } else {
    next[index] = thread;
  }

  await writeCollection(THREADS_KEY, THREADS_PATH, next);
}
