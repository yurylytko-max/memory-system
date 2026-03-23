"use client";

import { useEffect } from "react";

import { getAllPlans, type Plan } from "@/lib/plans";

const STORAGE_KEY = "planner_deadline_notifications_sent";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseStoredDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function loadSentNotifications() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveSentNotifications(entries: Record<string, number>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function cleanupSentNotifications(entries: Record<string, number>) {
  const threshold = Date.now() - ONE_DAY_MS * 30;
  const cleaned: Record<string, number> = {};

  for (const [key, timestamp] of Object.entries(entries)) {
    if (timestamp >= threshold) {
      cleaned[key] = timestamp;
    }
  }

  return cleaned;
}

function buildNotification(task: Plan["tasks"][number], plan: Plan) {
  if (!task.deadline || task.done) {
    return null;
  }

  const today = getTodayStart();
  const deadline = parseStoredDate(task.deadline);
  const diffDays = Math.round((deadline.getTime() - today.getTime()) / ONE_DAY_MS);

  if (diffDays > 1) {
    return null;
  }

  if (diffDays === 1) {
    return {
      title: "Дедлайн завтра",
      key: `${task.id}:${task.deadline}:tomorrow`,
    };
  }

  if (diffDays === 0) {
    return {
      title: "Дедлайн сегодня",
      key: `${task.id}:${task.deadline}:today`,
    };
  }

  return {
    title: "Задача просрочена",
    key: `${task.id}:${task.deadline}:overdue`,
  };
}

function notifyDeadlines(plans: Plan[]) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const sentNotifications = cleanupSentNotifications(loadSentNotifications());
  let changed = false;

  for (const plan of plans) {
    for (const task of plan.tasks) {
      const notification = buildNotification(task, plan);

      if (!notification || sentNotifications[notification.key]) {
        continue;
      }

      const browserNotification = new Notification(notification.title, {
        body: `${task.text}\nПлан: ${plan.name}`,
        tag: notification.key,
      });

      browserNotification.onclick = () => {
        window.focus();
        window.location.href = `/planner/${plan.id}`;
      };

      sentNotifications[notification.key] = Date.now();
      changed = true;
    }
  }

  if (changed) {
    saveSentNotifications(sentNotifications);
  }
}

export default function PlannerDeadlineManager() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    let disposed = false;

    async function checkDeadlines() {
      if (Notification.permission !== "granted") {
        return;
      }

      try {
        const plans = await getAllPlans();

        if (!disposed) {
          notifyDeadlines(plans);
        }
      } catch {
        // Ignore notification polling failures.
      }
    }

    void checkDeadlines();
    const intervalId = window.setInterval(() => {
      void checkDeadlines();
    }, 60_000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
