export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getPrisma } from "@/lib/prisma";
import { PicksHeroCards } from "./picks-hero.client";

type PickRow = {
  slug: string;
  displayName: string;
  shop: string;
  start: string;
  end: string;
  lat?: number;
  lng?: number;
  score?: number;
};

const fallbackPicks: PickRow[] = [
  {
    slug: "alice",
    displayName: "Alice",
    shop: "渋谷CHIC",
    start: "19:00",
    end: "23:00",
    lat: 35.658034,
    lng: 139.701636,
    score: 95,
  },
  {
    slug: "ben",
    displayName: "Ben",
    shop: "池袋Mellow",
    start: "20:00",
    end: "24:00",
    lat: 35.729503,
    lng: 139.7109,
    score: 90,
  },
  {
    slug: "chloe",
    displayName: "Chloe",
    shop: "吉祥寺Rest",
    start: "21:00",
    end: "24:00",
    lat: 35.703152,
    lng: 139.57978,
    score: 85,
  },
  {
    slug: "emi",
    displayName: "Emi",
    shop: "渋谷CHIC",
    start: "18:30",
    end: "22:30",
    lat: 35.658034,
    lng: 139.701636,
    score: 80,
  },
  {
    slug: "daisuke",
    displayName: "Daisuke",
    shop: "池袋Mellow",
    start: "19:30",
    end: "23:30",
    lat: 35.729503,
    lng: 139.7109,
    score: 70,
  },
];

async function getTodaysPicks(): Promise<PickRow[]> {
  const prisma = getPrisma();
  if (!prisma) return fallbackPicks;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shifts = await prisma.shift.findMany({
      where: { date: today },
      include: { person: true, shop: true },
    });
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const picks: PickRow[] = shifts.slice(0, 5).map((s, idx) => {
      const start = s.startTime ? new Date(s.startTime) : null;
      const end = s.endTime ? new Date(s.endTime) : null;
      const startStr = start ? `${pad2(start.getHours())}:${pad2(start.getMinutes())}` : "—";
      const endStr = end ? `${pad2(end.getHours())}:${pad2(end.getMinutes())}` : "—";
      const shopName = s.shop?.displayName ?? "—";
      const coords =
        shopName === "渋谷CHIC" ? { lat: 35.658034, lng: 139.701636 } :
        shopName === "池袋Mellow" ? { lat: 35.729503, lng: 139.7109 } :
        shopName === "吉祥寺Rest" ? { lat: 35.703152, lng: 139.57978 } :
        null;
      return {
        slug: s.person.slug,
        displayName: s.person.displayName,
        shop: shopName,
        start: startStr,
        end: endStr,
        lat: coords?.lat,
        lng: coords?.lng,
        score: 100 - idx, // preserve DB order as strength proxy
      };
    });
    return picks;
  } catch {
    return fallbackPicks;
  }
}

export default async function HomePage() {
  const picks = await getTodaysPicks();
  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(new Date());

  return (
    <main className="bg-black text-white overflow-x-hidden">
      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-black" />
        <div className="absolute -left-28 -top-28 h-[28rem] w-[28rem] rounded-full bg-zinc-800/25 blur-3xl" />
        <div className="absolute -right-40 top-10 h-[34rem] w-[34rem] rounded-full bg-zinc-700/15 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black to-transparent" />

        <div className="relative mx-auto w-full max-w-7xl px-5 pt-10 md:px-10 md:pt-14">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-[34px] font-semibold leading-[1.1] tracking-tight text-zinc-100 md:text-[52px]">
                この人のシーシャに会いに行く。
              </h1>
              <p className="mt-4 max-w-[28rem] text-sm text-zinc-400 md:text-base">
                店ではなく、作る人で選ぶ。
              </p>
            </div>
            <div className="mt-1 whitespace-nowrap text-xs text-zinc-500">
              {dateLabel}
            </div>
          </div>
        </div>
      </section>

      {/* Picks overlap the hero so the first row is partly “cut” on initial view */}
      <section className="-mt-24 pb-10 md:-mt-32 md:pb-14">
        <PicksHeroCards picks={picks} />
      </section>
    </main>
  );
}
