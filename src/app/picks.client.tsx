"use client";

import { useEffect, useMemo, useState } from "react";

type PickRow = {
  slug: string;
  displayName: string;
  shop: string;
  start: string;
  end: string;
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

function tierFor(slug: string): "Ⅰ" | "Ⅱ" | "Ⅲ" | null {
  const map: Record<string, "Ⅰ" | "Ⅱ" | "Ⅲ"> = {
    emi: "Ⅰ",
    fuji: "Ⅱ",
    chloe: "Ⅲ",
  };
  return map[slug] ?? null;
}

export function PicksWithAll({ picks, todayAll }: { picks: PickRow[]; todayAll: TodayRow[] }) {
  const [loc, setLoc] = useState<{ lat: number; lng: number }>(SHIBUYA);
  const [nearby, setNearby] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

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
      const km = has ? haversineKm(loc, { lat: p.lat!, lng: p.lng! }) : Number.POSITIVE_INFINITY;
      const score = typeof p.score === "number" ? p.score : 0;
      return { ...p, _km: km, _score: score, _idx: idx };
    });

    if (nearby) {
      return [...withDist].sort((a, b) => a._km - b._km || b._score - a._score || a._idx - b._idx);
    }
    // curated default
    return [...withDist].sort((a, b) => b._score - a._score || a._idx - b._idx);
  }, [picks, todayAll, loc, nearby]);

  const shown = computed.slice(0, Math.min(visibleCount, 20));

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold mb-4">Today’s Picks</h1>
        <button
          type="button"
          onClick={() => setNearby((v) => !v)}
          className={"text-xs hover:underline underline-offset-4 decoration-zinc-700/70 " + (nearby ? "text-zinc-200" : "text-zinc-500")}
        >
          近い順
        </button>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {shown.map((p: any, idx: number) => {
          const tier = tierFor(p.slug);
          const km = Number.isFinite(p._km) ? p._km : null;
          const primary = idx < 5;
          return (
            <div key={`${p.slug}-${p.shop}-${p.start}-${idx}`} className={primary ? "py-5" : "py-3"}>
              <div className="flex items-baseline justify-between gap-6">
                <a
                  href={`/people/${p.slug}`}
                  className={
                    "min-w-0 truncate hover:underline underline-offset-4 decoration-zinc-700/70 " +
                    (primary ? "text-lg font-semibold text-zinc-100" : "text-sm font-medium text-zinc-300")
                  }
                >
                  {p.displayName}
                  {tier ? <span className="ml-2 text-sm font-normal text-zinc-500">{tier}</span> : null}
                </a>
                <div className={"flex min-w-0 items-baseline gap-3 " + (primary ? "text-sm text-zinc-400" : "text-xs text-zinc-500")}>
                  <span className="min-w-0 truncate">{p.shop}</span>
                  <span className="whitespace-nowrap font-mono tabular-nums">{p.start}-{p.end}</span>
                  <span className="whitespace-nowrap text-xs text-zinc-600">{km != null ? `${km.toFixed(1)}km` : "—"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleCount < 20 && computed.length > 5 ? (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setVisibleCount(20)}
            className="text-sm text-zinc-500 hover:underline underline-offset-4 decoration-zinc-700/70"
          >
            すべてを見る
          </button>
        </div>
      ) : null}
    </>
  );
}
