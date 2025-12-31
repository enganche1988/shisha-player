export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getPrisma } from "@/lib/prisma";

type Pick = {
  slug: string;
  displayName: string;
  today?: {
    shop?: string;
    start?: string;
    end?: string;
  };
};

function getShopAndTime(p: Pick): { shop: string; time: string } {
  const shop = p.today?.shop ?? "—";
  const start = p.today?.start;
  const end = p.today?.end;
  const time = start && end ? `${start}-${end}` : "—";
  return { shop, time };
}

function tierFor(slug: string): "Ⅰ" | "Ⅱ" | "Ⅲ" | null {
  const map: Record<string, "Ⅰ" | "Ⅱ" | "Ⅲ"> = {
    emi: "Ⅰ",
    fuji: "Ⅱ",
    chloe: "Ⅲ",
  };
  return map[slug] ?? null;
}

const fallbackPeople: Pick[] = [
  {
    slug: "alice",
    displayName: "Alice",
    today: { shop: "渋谷CHIC", start: "19:00", end: "23:00" },
  },
  {
    slug: "ben",
    displayName: "Ben",
    today: { shop: "池袋Mellow", start: "20:00", end: "24:00" },
  },
  {
    slug: "chloe",
    displayName: "Chloe",
    today: { shop: "吉祥寺Rest", start: "21:00", end: "24:00" },
  },
  {
    slug: "emi",
    displayName: "Emi",
    today: { shop: "渋谷CHIC", start: "18:30", end: "22:30" },
  },
  {
    slug: "daisuke",
    displayName: "Daisuke",
    today: { shop: "池袋Mellow", start: "19:30", end: "23:30" },
  },
];

async function getTodaysPicks() {
  const prisma = getPrisma();
  if (!prisma) return fallbackPeople;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shifts = await prisma.shift.findMany({
      where: { date: today },
      include: { person: true, shop: true },
    });
    const picks: Pick[] = shifts.slice(0, 5).map(s => {
      const start = s.startTime ? new Date(s.startTime) : null;
      const end = s.endTime ? new Date(s.endTime) : null;
      const pad2 = (n: number) => String(n).padStart(2, "0");
      const startStr = start ? `${pad2(start.getHours())}:${pad2(start.getMinutes())}` : undefined;
      const endStr = end ? `${pad2(end.getHours())}:${pad2(end.getMinutes())}` : undefined;
      const shopName = s.shop?.displayName ?? undefined;
      return {
        slug: s.person.slug,
        displayName: s.person.displayName,
        today: { shop: shopName, start: startStr, end: endStr },
      };
    });
    return picks;
  } catch {
    return fallbackPeople;
  }
}

export default async function HomePage() {
  const picks = await getTodaysPicks();
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-full max-w-xl px-4 py-20">
        <h1 className="text-2xl font-bold mb-4">Today’s Picks</h1>
        <div className="divide-y divide-zinc-800/50">
          {picks.slice(0, 5).map(p => {
            const tier = tierFor(p.slug);
            const meta = getShopAndTime(p);
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
                    <span className="min-w-0 truncate">{meta.shop}</span>
                    <span className="whitespace-nowrap font-mono tabular-nums">{meta.time}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-10">
          <a
            href="/people/alice"
            className="text-xs text-zinc-500 hover:underline underline-offset-4 decoration-zinc-700/70"
          >
            声
          </a>
        </div>
      </div>
    </main>
  );
}
