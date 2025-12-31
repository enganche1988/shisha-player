"use client";

import { useEffect, useMemo, useState } from "react";
import { TodayAll } from "./today-all.client";

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

function Toggle({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-xs hover:underline underline-offset-4 decoration-zinc-700/70 " +
        (active ? "text-zinc-200" : "text-zinc-500")
      }
    >
      {children}
    </button>
  );
}

export function PicksWithAll({ picks, todayAll }: { picks: PickRow[]; todayAll: TodayRow[] }) {
  const [loc, setLoc] = useState<{ lat: number; lng: number }>(SHIBUYA);
  const [mode, setMode] = useState<"curated" | "nearby">("curated");
  const [showAll, setShowAll] = useState(false);

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
    const withDist = picks.map((p, idx) => {
      const has = p.lat != null && p.lng != null;
      const km = has ? haversineKm(loc, { lat: p.lat!, lng: p.lng! }) : Number.POSITIVE_INFINITY;
      const score = typeof p.score === "number" ? p.score : (100 - idx);
      return { ...p, _km: km, _score: score, _idx: idx };
    });

    if (mode === "nearby") {
      return [...withDist].sort((a, b) => a._km - b._km || a._idx - b._idx);
    }
    // curated
    return [...withDist].sort((a, b) => b._score - a._score || a._idx - b._idx);
  }, [picks, loc, mode]);

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold mb-4">Today’s Picks</h1>
        <div className="flex items-center gap-2">
          <Toggle active={mode === "curated"} onClick={() => setMode("curated")}>Curated</Toggle>
          <span className="text-zinc-700">|</span>
          <Toggle active={mode === "nearby"} onClick={() => setMode("nearby")}>Nearby</Toggle>
        </div>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {computed.slice(0, 5).map((p) => {
          const tier = tierFor(p.slug);
          const km = Number.isFinite(p._km) ? p._km : null;
          return (
            <div key={p.slug} className="py-4">
              <div className="flex items-baseline justify-between gap-6">
                <a
                  href={`/people/${p.slug}`}
                  className="min-w-0 truncate text-lg font-semibold text-zinc-100 hover:underline underline-offset-4 decoration-zinc-700/70"
                >
                  {p.displayName}
                  {tier ? <span className="ml-2 text-sm font-normal text-zinc-500">{tier}</span> : null}
                </a>
                <div className="flex min-w-0 items-baseline gap-3 text-sm text-zinc-400">
                  <span className="min-w-0 truncate">{p.shop}</span>
                  <span className="whitespace-nowrap font-mono tabular-nums">{p.start}-{p.end}</span>
                  <span className="whitespace-nowrap text-xs text-zinc-600">
                    {km != null ? `${km.toFixed(1)}km` : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!showAll ? (
        <div className="mt-10">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-sm text-zinc-500 hover:underline underline-offset-4 decoration-zinc-700/70"
          >
            すべて見る
          </button>
        </div>
      ) : (
        <TodayAll rows={todayAll} />
      )}
    </>
  );
}
