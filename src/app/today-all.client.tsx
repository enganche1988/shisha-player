"use client";

import { useEffect, useMemo, useState } from "react";

type TodayRow = {
  slug: string;
  displayName: string;
  shop: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  lat?: number;
  lng?: number;
};

type Props = {
  rows: TodayRow[];
};

const SHIBUYA = { lat: 35.658034, lng: 139.701636 };

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function inRangeNow(row: TodayRow) {
  const now = nowMinutes();
  const s = toMinutes(row.start);
  const e = toMinutes(row.end);
  // handle end past midnight (e.g. 24:00)
  const end = e === 0 && row.end.startsWith("24") ? 24 * 60 : e;
  return now >= s && now <= end;
}

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

function timeFilterMatch(row: TodayRow, filter: string) {
  if (filter === "now") return inRangeNow(row);
  const s = toMinutes(row.start);
  if (filter === "19-21") return s >= 19 * 60 && s < 21 * 60;
  if (filter === "21-23") return s >= 21 * 60 && s < 23 * 60;
  if (filter === "23+") return s >= 23 * 60;
  return true;
}

function Chip({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs transition-colors " +
        (active
          ? "border-zinc-600 bg-zinc-100/10 text-zinc-100"
          : "border-zinc-800/60 text-zinc-400 hover:text-zinc-300")
      }
    >
      {children}
    </button>
  );
}

export function TodayAll({ rows }: Props) {
  const [loc, setLoc] = useState<{ lat: number; lng: number }>(SHIBUYA);
  const [shopFilter, setShopFilter] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

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

  const shops = useMemo(() => {
    const set = new Set(rows.map((r) => r.shop));
    return Array.from(set);
  }, [rows]);

  const timeChips = [
    { key: "now", label: "いま行ける" },
    { key: "19-21", label: "19–21" },
    { key: "21-23", label: "21–23" },
    { key: "23+", label: "23+" },
  ];

  const computed = useMemo(() => {
    const withDist = rows.map((r) => {
      const here = loc;
      const shopLoc = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null;
      const d = shopLoc ? haversineKm(here, shopLoc) : Number.POSITIVE_INFINITY;
      return { ...r, _km: d, _now: inRangeNow(r), _start: toMinutes(r.start) };
    });

    let filtered = withDist;
    if (shopFilter) filtered = filtered.filter((r) => r.shop === shopFilter);
    if (timeFilter) filtered = filtered.filter((r) => timeFilterMatch(r, timeFilter));

    filtered.sort((a, b) => {
      // 1) near
      if (a._km !== b._km) return a._km - b._km;
      // 2) now
      if (a._now !== b._now) return a._now ? -1 : 1;
      // 3) start
      if (a._start !== b._start) return a._start - b._start;
      // stable
      return (a.slug + a.shop).localeCompare(b.slug + b.shop);
    });

    return filtered;
  }, [rows, loc, shopFilter, timeFilter]);

  const visible = computed.slice(0, limit);

  return (
    <section className="mt-14">
      <h2 className="text-lg font-bold mb-4">Today</h2>

      <div className="mb-5 flex flex-wrap gap-2">
        {shops.map((s) => (
          <Chip
            key={s}
            active={shopFilter === s}
            onClick={() => {
              setLimit(20);
              setShopFilter(shopFilter === s ? null : s);
            }}
          >
            {s}
          </Chip>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {timeChips.map((t) => (
          <Chip
            key={t.key}
            active={timeFilter === t.key}
            onClick={() => {
              setLimit(20);
              setTimeFilter(timeFilter === t.key ? null : t.key);
            }}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="divide-y divide-zinc-800/50">
        {visible.map((r) => {
          const km = Number.isFinite(r._km) ? r._km : null;
          return (
            <div key={`${r.slug}-${r.shop}-${r.start}`} className="py-4">
              <div className="flex items-baseline justify-between gap-6">
                <a
                  href={`/people/${r.slug}`}
                  className="min-w-0 truncate text-lg font-semibold text-zinc-100 hover:underline underline-offset-4 decoration-zinc-700/70"
                >
                  {r.displayName}
                </a>
                <div className="flex min-w-0 items-baseline gap-3 text-sm text-zinc-400">
                  <span className="min-w-0 truncate">{r.shop}</span>
                  <span className="whitespace-nowrap font-mono tabular-nums">{r.start}-{r.end}</span>
                  {km != null ? (
                    <span className="whitespace-nowrap text-xs text-zinc-600">{km.toFixed(1)}km</span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {computed.length > visible.length ? (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setLimit((n) => n + 20)}
            className="text-sm text-zinc-500 hover:underline underline-offset-4 decoration-zinc-700/70"
          >
            さらに表示
          </button>
        </div>
      ) : null}
    </section>
  );
}
