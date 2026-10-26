"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Box } from "@mui/material";

const isModifiedClick = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const isInternalNavigation = (anchor: HTMLAnchorElement) => {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;

  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin && (
      url.pathname !== window.location.pathname || url.search !== window.location.search
    );
  } catch {
    return false;
  }
};

export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const activeRef = useRef(false);
  const previousPathname = useRef(pathname);
  const progressTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    progressTimer.current = null;
    hideTimer.current = null;
  }, []);

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
    progressTimer.current = null;
    setProgress(100);
    hideTimer.current = window.setTimeout(() => {
      activeRef.current = false;
      setVisible(false);
      setProgress(0);
      hideTimer.current = null;
    }, 180);
  }, []);

  const start = useCallback(() => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = null;
    if (!activeRef.current) {
      activeRef.current = true;
      setVisible(true);
      setProgress(8);
    }
    if (progressTimer.current !== null) return;

    progressTimer.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 88) return current;
        return current + Math.max(1, (88 - current) * 0.08);
      });
    }, 180);
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (activeRef.current) finish();
    else {
      // Programmatic router navigation has no click event to hook into. Show a
      // short completion state when the new route becomes current.
      start();
      window.setTimeout(finish, 120);
    }
  }, [finish, pathname, start]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (isModifiedClick(event)) return;
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (target instanceof HTMLAnchorElement && isInternalNavigation(target)) start();
    };
    const handlePopState = () => start();

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      clearTimers();
    };
  }, [clearTimers, start]);

  return (
    <Box
      aria-label="Loading page"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(progress)}
      className="navigation-progress"
      role="progressbar"
      sx={{ opacity: visible ? 1 : 0 }}
    >
      <Box className="navigation-progress-bar" sx={{ width: `${progress}%` }} />
    </Box>
  );
}
