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

function formatTodayLine(p: Pick) {
  const shop = p.today?.shop;
  const start = p.today?.start;
  const end = p.today?.end;
  if (!shop || !start || !end) return "Today: —";
  return `Today: ${shop} · ${start}-${end}`;
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
        <div className="space-y-5">
          {picks.map(p => (
            <div
              key={p.slug}
              className="rounded-xl bg-zinc-900 px-6 py-5 flex items-center gap-5"
            >
              <div className="flex-1">
                <a href={`/people/${p.slug}`} className="text-lg font-semibold hover:underline text-zinc-100">
                  {p.displayName}
                </a>
                <div className="text-sm text-zinc-400 mt-1">{formatTodayLine(p)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
