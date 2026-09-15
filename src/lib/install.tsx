"use client";

import { useEffect, useState } from "react";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function iosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function openedAsInstalledApp() {
  if (process.env.NODE_ENV !== "production") return false;
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches && Boolean(navigator.serviceWorker?.controller);
}

export function useInstall() {
  const [promptEvent, setPromptEvent] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const opened = openedAsInstalledApp();
    setInstalled(opened);
    setIos(iosDevice() && !opened);
    if (opened) document.documentElement.classList.add("standalone");

    if ("serviceWorker" in navigator) {
      const skipWorker = window.location.pathname.startsWith("/download");
      if (!skipWorker) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as PromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setHint(false);
      document.documentElement.classList.add("standalone");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return {
    installed,
    canInstall: !installed,
    ios,
    hint,
    showHint: () => setHint(true),
    hideHint: () => setHint(false),
    install: async () => {
      if (promptEvent) {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
        setPromptEvent(null);
        return;
      }
      setHint(true);
    },
  };
}
