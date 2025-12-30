import { prisma } from "@/lib/prisma";

const fallbackPeople = [
  {
    slug: "alice",
    displayName: "Alice",
    shop: { area: "渋谷", displayName: "渋谷CHIC" },
  },
  {
    slug: "ben",
    displayName: "Ben",
    shop: { area: "池袋", displayName: "池袋Mellow" },
  },
  {
    slug: "chloe",
    displayName: "Chloe",
    shop: { area: "吉祥寺", displayName: "吉祥寺Rest" },
  },
];

async function getTodaysPicks() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shifts = await prisma.shift.findMany({
      where: { date: today },
      include: { person: true, shop: true },
    });
    const picks = shifts
      .slice(0, 5)
      .map(s => ({
        slug: s.person.slug,
        displayName: s.person.displayName,
        shop: s.shop,
      }));
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
                <div className="text-sm text-zinc-400 mt-1">
                  {p.shop?.area && <span>{p.shop.area}・</span>}{p.shop?.displayName}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
