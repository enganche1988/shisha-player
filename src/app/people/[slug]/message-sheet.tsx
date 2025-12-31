"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  displayName: string;
  todayDate: Date;
  todayShop: string | null;
  todayTime: string | null;
  instagramUrl: string | null;
};

function formatMonthDay(d: Date) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}月${day}日`;
}

function buildTemplate(displayName: string, todayDate: Date, todayShop: string | null, todayTime: string | null) {
  const md = formatMonthDay(todayDate);
  const lines: string[] = [];
  lines.push("shisha-player を見てご連絡しました。", "");
  if (todayShop) {
    lines.push(`本日（${md}）、${todayShop}での出勤を拝見しています。`, "");
  } else {
    lines.push(`本日（${md}）、出勤を拝見しています。`, "");
  }
  if (todayTime) {
    lines.push("もし可能でしたら、これから伺いたいです。", "");
  } else {
    lines.push("もし可能でしたら、これから伺いたいです。", "");
  }

  return lines.join("\n");
}

export function MessageSheet({ displayName, todayDate, todayShop, todayTime, instagramUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const initialText = useMemo(
    () => buildTemplate(displayName, todayDate, todayShop, todayTime),
    [displayName, todayDate, todayShop, todayTime]
  );
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (!open) return;
    setText(initialText);
  }, [open, initialText]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore; navigator.clipboard unavailable
    }
    setCopied(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 900);
  }, [text]);

  const onCopyAndOpen = useCallback(async () => {
    await onCopy();
    const url = instagramUrl ?? "https://instagram.com/";
    window.open(url, "_blank", "noopener,noreferrer");
  }, [instagramUrl, onCopy]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-zinc-700/60 bg-zinc-100/10 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-100/15"
      >
        メッセージを用意してInstagramを開く
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/60"
          />

          <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-800/50 bg-black/90 backdrop-blur-sm">
            <div className="mx-auto max-w-2xl px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">{copied ? "コピーしました" : ""}</div>
                <button
                  type="button"
                  onClick={close}
                  className="text-zinc-500 hover:text-zinc-300 text-sm"
                >
                  ×
                </button>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={onCopyAndOpen}
                  className="w-full rounded-lg bg-zinc-100/10 px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-100/15"
                >
                  メッセージをコピーしてInstagramを開く
                </button>
                <div className="mt-2 text-xs text-zinc-500">※ 押すと、下の文章が自動でコピーされます</div>
              </div>

              <div className="mt-5 text-xs text-zinc-400">Instagramで送られるメッセージ</div>

              <div className="mt-3">
                <div
                  className="w-full rounded-md border border-zinc-800/60 bg-zinc-900/60 p-4 text-sm leading-7 text-zinc-200"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {text}
                </div>
              </div>

              <div className="mt-3 text-xs text-zinc-500 space-y-1">
                <div>・この文面はコピーできます</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
