"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export default function PlannerNotificationsButton() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
  }, []);

  async function requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
  }

  if (permission === "unsupported") {
    return null;
  }

  if (permission === "granted") {
    return (
      <p className="text-sm text-muted-foreground">
        Уведомления о дедлайнах включены.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Уведомления заблокированы в браузере. Разрешите их в настройках сайта.
      </p>
    );
  }

  return (
    <Button type="button" variant="outline" onClick={() => {
      void requestPermission();
    }}>
      Включить уведомления о дедлайнах
    </Button>
  );
}
