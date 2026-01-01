"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { peopleImageSrc } from "@/lib/people-image";

const SHOW_REALTIME_UI = false; // phase0': hide distance / nearby / status

type PickRow = {
  slug: string;
  displayName: string;
  shop: string;
  start: string;
  end: string;
  image: string; // filename with extension, e.g. "daigo.jpg" / "alice.svg"
  lat?: number;
  lng?: number;
  score?: number; // higher = stronger (curated)
};

type TodayRow = {
  slug: string;
  displayName: string;
  shop: string;
  start: string;
  end: string;
  image: string;
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

function isLateSlot(start: string, end: string): boolean {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null) return false;
  // treat "24:00" as 1440; if end is smaller it crosses midnight anyway
  return s >= 23 * 60 || e >= 24 * 60 || e <= s;
}

function kmLabel(km: number | null): string {
  if (km == null) return "—";
  const s = km.toFixed(1);
  if (s === "0.0") return "徒歩圏内";
  return `${s}km`;
}

function badgeFor(p: PickRow & { _km: number | null }): { label: string; tone: string } | null {
  if (p._km != null && p._km <= 1.0) {
    return { label: "徒歩圏内", tone: "border-white/10 bg-white/10 text-zinc-100" };
  }
  if (isLateSlot(p.start, p.end)) {
    return { label: "深夜枠", tone: "border-zinc-500/20 bg-zinc-500/10 text-zinc-200" };
  }
  return null;
}

export function PicksHeroCards({ picks, todayAll }: { picks: PickRow[]; todayAll: TodayRow[] }) {
  const [loc, setLoc] = useState<{ lat: number; lng: number }>(SHIBUYA);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    if (!SHOW_REALTIME_UI) return;
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
    const pickMap = new Map<string, PickRow>();
    picks.forEach((p) => pickMap.set(p.slug, p));

    const merged: PickRow[] = [
      ...picks,
      ...todayAll
        .filter((r) => !pickMap.has(r.slug))
        .map((r) => ({
          ...r,
          score: 0,
        })),
    ];

    const withDist = merged.map((p, idx) => {
      const has = p.lat != null && p.lng != null;
      const km = SHOW_REALTIME_UI && has ? haversineKm(loc, { lat: p.lat!, lng: p.lng! }) : null;
      const score = typeof p.score === "number" ? p.score : 0;
      return { ...p, _km: km, _score: score, _idx: idx };
    });
    return [...withDist].sort((a, b) => b._score - a._score || a._idx - b._idx);
  }, [picks, todayAll, loc]);

  const shown = computed.slice(0, Math.min(visibleCount, 20));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-14">
        {shown.map((p: any) => {
          return (
            <Link
              key={String(p.slug)}
              href={`/people/${p.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-black/10"
            >
              <div className="relative aspect-[3/4]">
                <Image
                  src={peopleImageSrc(p.image)}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-center grayscale"
                  priority={false}
                  unoptimized
                />

                {/* dark overlay for quiet tone */}
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

                {/* name pill */}
                <div className="absolute bottom-6 left-6">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-7 py-3 text-[28px] font-semibold tracking-wide text-zinc-100/90 backdrop-blur-sm">
                    {p.displayName}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {visibleCount < 20 && computed.length > 5 ? (
        <div className="pt-6">
          <button
            type="button"
            onClick={() => setVisibleCount(20)}
            className="text-sm text-zinc-500 hover:underline underline-offset-4 decoration-zinc-700/70"
          >
            すべてを見る
          </button>
        </div>
      ) : null}
    </div>
  );
}


