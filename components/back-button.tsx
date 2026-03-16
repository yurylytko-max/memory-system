"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref: string;
  children: React.ReactNode;
  className?: string;
};

export function BackButton({
  fallbackHref,
  children,
  className,
}: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    const state = window.history.state as { idx?: number } | null;
    const hasAppHistory = typeof state?.idx === "number" && state.idx > 0;

    if (hasAppHistory) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  }

  return (
    <button type="button" onClick={handleBack} className={className}>
      {children}
    </button>
  );
}
