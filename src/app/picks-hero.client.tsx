"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PickRow = {
  slug: string;
  displayName: string;
  shop: string;
  start: string;
  end: string;
  lat?: number;
  lng?: number;
};

const SHIBUYA = { lat: 35.658034, lng: 139.701636 };

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  return h * 60 + mm;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function inRangeNow(start: string, end: string): boolean {
  const s0 = toMinutes(start);
  const e0 = toMinutes(end);
  if (s0 == null || e0 == null) return false;

  let s = s0;
  let e = e0;
  let n = nowMinutes();

  // overnight: 23:00-24:00 or 23:00-02:00 style
  if (e <= s) e += 1440;
  if (n < s) n += 1440;
  return n >= s && n <= e;
}

function isLateSlot(start: string, end: string): boolean {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null) return false;
  // treat "24:00" as 1440; if end is smaller it crosses midnight anyway
  return s >= 23 * 60 || e >= 24 * 60 || e <= s;
}

function statusTag(p: PickRow): { label: string; tone: string } {
  if (inRangeNow(p.start, p.end)) {
    return { label: "出勤中", tone: "border-white/10 bg-white/10 text-zinc-100" };
  }
  if (isLateSlot(p.start, p.end)) {
    return { label: "深夜枠", tone: "border-zinc-500/20 bg-zinc-500/10 text-zinc-200" };
  }
  return { label: "今日ここ", tone: "border-zinc-400/15 bg-zinc-400/10 text-zinc-200" };
}

function kmLabel(km: number | null): string {
  if (km == null) return "—";
  const s = km.toFixed(1);
  if (s === "0.0") return "徒歩圏内";
  return `${s}km`;
}

export function PicksHeroCards({ picks }: { picks: PickRow[] }) {
  const [loc, setLoc] = useState<{ lat: number; lng: number }>(SHIBUYA);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {
        // keep fallback
      },
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 60_000 }
    );
  }, []);

  const computed = useMemo(() => {
    return picks.map((p) => {
      const has = p.lat != null && p.lng != null;
      const km = has ? haversineKm(loc, { lat: p.lat!, lng: p.lng! }) : null;
      return { ...p, _km: km };
    });
  }, [picks, loc]);

  return (
    <div className="mx-auto w-full max-w-7xl px-3 md:px-10">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {computed.map((p) => {
          const tag = statusTag(p);
          const meta = `${p.shop}  ${p.start}-${p.end}  ${kmLabel(p._km)}`;
          return (
            <Link
              key={`${p.slug}-${p.shop}-${p.start}`}
              href={`/people/${p.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-950 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
            >
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
                <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-zinc-700/20 blur-3xl" />
                <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-zinc-600/10 blur-3xl" />
                <div className="absolute inset-0 bg-black/35" />
              </div>

              <div className="relative aspect-[16/10] md:aspect-[4/5]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

                <div className="absolute left-3 top-3">
                  <span className={"inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] tracking-wide " + tag.tone}>
                    {tag.label}
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-[22px] font-semibold leading-tight tracking-tight text-zinc-100 md:text-[26px]">
                    {p.displayName}
                  </div>
                  <div className="mt-1 text-xs text-zinc-300/80">
                    {meta}
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-white/5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}


