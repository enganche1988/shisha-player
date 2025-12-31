"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  displayName: string;
  todayShop: string | null;
  todayTime: string | null;
  instagramUrl: string | null;
};

function buildTemplate(displayName: string, todayShop: string | null, todayTime: string | null) {
  const lines: string[] = [];
  lines.push("シーシャプレイヤーで拝見しました。", "");

  if (todayShop) {
    lines.push(`本日、${todayShop}にいらっしゃる予定を見てご連絡しました。`, "");
  } else {
    lines.push("本日ご連絡しました。", "");
  }

  if (todayTime) {
    lines.push(`${todayTime}ごろ伺いたいのですが、混み具合いかがでしょう？`, "");
  } else {
    lines.push("本日伺いたいのですが、混み具合いかがでしょう？", "");
  }

  lines.push("可能なら目安だけ教えてください。", "");

  if (displayName && displayName.trim().length > 0) {
    lines.push(`— ${displayName}`);
  }

  return lines.join("\n");
}

export function MessageSheet({ displayName, todayShop, todayTime, instagramUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const text = useMemo(
    () => buildTemplate(displayName, todayShop, todayTime),
    [displayName, todayShop, todayTime]
  );

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
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.select();
        document.execCommand("copy");
      }
    }
    setCopied(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 900);
  }, [text]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-zinc-500 hover:underline underline-offset-4 decoration-zinc-700/70"
      >
        DM
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
                <div className="text-xs text-zinc-500">{copied ? "Copied" : ""}</div>
                <button
                  type="button"
                  onClick={close}
                  className="text-zinc-500 hover:text-zinc-300 text-sm"
                >
                  ×
                </button>
              </div>

              <div className="mt-3">
                <textarea
                  ref={textareaRef}
                  readOnly
                  value={text}
                  className="w-full resize-none rounded-md bg-zinc-950/80 p-3 text-sm leading-6 text-zinc-200 outline-none"
                  rows={9}
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onCopy}
                  className="text-sm text-zinc-300 hover:underline underline-offset-4 decoration-zinc-700/70"
                >
                  Copy
                </button>

                {instagramUrl ? (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-zinc-500 hover:underline underline-offset-4 decoration-zinc-700/70"
                  >
                    Open Instagram
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
