"use client";

import { useEffect, useState } from "react";

import { obtenerContadorNoLeidas } from "@/features/notificaciones/client";

type NotificationBadgeProps = {
  className?: string;
};

export function NotificationBadge({ className }: NotificationBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await obtenerContadorNoLeidas();
        if (active) setCount(response.unread_count);
      } catch {
        if (active) setCount(0);
      }
    }

    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span
      className={
        className ??
        "absolute -top-1 -right-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white"
      }
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
