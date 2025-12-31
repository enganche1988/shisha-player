export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getPrisma } from "@/lib/prisma";

type TodayInfo = { shop?: string; start?: string; end?: string };
type FallbackShift = { id: string; shop: { area?: string; displayName: string }; date: Date; start?: string; end?: string };

function formatTodayLine(today: TodayInfo | undefined) {
  const shop = today?.shop;
  const start = today?.start;
  const end = today?.end;
  if (!shop || !start || !end) return "Today: —";
  return `Today: ${shop} · ${start}-${end}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fallbackDataFor(slug: string | undefined) {
  const s = typeof slug === "string" && slug.length > 0 ? slug : "anonymous";
  const simpleName = s.charAt(0).toUpperCase() + s.slice(1);
  const today: TodayInfo = { shop: "渋谷CHIC", start: "19:00", end: "23:00" };
  const weekShifts: FallbackShift[] = [
    { id: "t", shop: { area: "渋谷", displayName: "渋谷CHIC" }, date: new Date(), start: "19:00", end: "23:00" },
    { id: "w1", shop: { area: "池袋", displayName: "池袋Mellow" }, date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), start: "20:00", end: "24:00" },
  ];
  return {
    person: {
      displayName: simpleName,
      isStaff: true,
      canComment: true,
    },
    today,
    abouts: [
      { id: "b", fromPerson: { slug: "ben", displayName: "Ben" }, body: "Creativity!" }
    ],
    weekShifts,
    bys: [
      { id: "to1", toPerson: { slug: "ben", displayName: "Ben" } }
    ]
  };
}

async function getPersonData(slug: string | undefined) {
  const prisma = getPrisma();
  if (!slug) return fallbackDataFor(slug);
  if (!prisma) return fallbackDataFor(slug);
  try {
    const person = await prisma.person.findUnique({ where: { slug } });
    if (!person) return fallbackDataFor(slug);

    const aboutsRaw = await prisma.recommendation.findMany({
      where: { toPersonId: person.id, isApproved: true },
      include: { fromPerson: true },
      orderBy: [{ createdAt: "desc" }]
    });
    const abouts = await Promise.all(
      aboutsRaw.map(async rec => ({
        ...rec,
        fromPersonReceivedCount: await prisma.recommendation.count({ where: { toPersonId: rec.fromPersonId, isApproved: true } })
      }))
    );
    abouts.sort((a, b) =>
      b.fromPersonReceivedCount - a.fromPersonReceivedCount ||
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    const aboutsTop = abouts.filter(Boolean).slice(0, 3);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + (6 - today.getDay()));

    const weekShifts = await prisma.shift.findMany({
      where: {
        personId: person.id,
        date: { gte: weekStart, lte: weekEnd }
      },
      include: { shop: true }
    });

    const bys = await prisma.recommendation.findMany({
      where: { fromPersonId: person.id, isApproved: true },
      include: { toPerson: true },
      orderBy: [{ createdAt: "desc" }],
      take: 6
    });

    // derive "Today" from shifts if available
    const todayShift = weekShifts.find(s => isSameDay(new Date(s.date), today));
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const start = todayShift?.startTime ? new Date(todayShift.startTime) : null;
    const end = todayShift?.endTime ? new Date(todayShift.endTime) : null;
    const todayInfo: TodayInfo | undefined = todayShift
      ? {
          shop: todayShift.shop?.displayName,
          start: start ? `${pad2(start.getHours())}:${pad2(start.getMinutes())}` : undefined,
          end: end ? `${pad2(end.getHours())}:${pad2(end.getMinutes())}` : undefined,
        }
      : undefined;

    return { person, today: todayInfo, abouts: aboutsTop, weekShifts, bys };
  } catch {
    return fallbackDataFor(slug);
  }
}

export default async function PeopleDetail({ params }: { params: { slug?: string } }) {
  const data = await getPersonData(params?.slug);
  const { person, today, abouts, weekShifts, bys } = data as any;
  const now = new Date();
  const weekOnly = Array.isArray(weekShifts)
    ? (weekShifts as any[]).filter(s => {
        const d = s?.date instanceof Date ? s.date : new Date(s?.date);
        return !isSameDay(d, now);
      })
    : [];

  return (
    <main className="min-h-screen bg-black text-zinc-100 py-10 px-4 max-w-2xl mx-auto">
      {/* Today */}
      <section className="mb-10">
        <div className="text-sm text-zinc-300">{formatTodayLine(today)}</div>
      </section>

      {/* This Week (optional) */}
      {person.isStaff && weekOnly.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-3">This Week</h2>
          <ul className="space-y-2">
            {weekOnly.map((s: any) => {
              const d = s.date instanceof Date ? s.date : new Date(s.date);
              const start = s.startTime ? new Date(s.startTime) : null;
              const end = s.endTime ? new Date(s.endTime) : null;
              const pad2 = (n: number) => String(n).padStart(2, "0");
              const startStr = s.start ?? (start ? `${pad2(start.getHours())}:${pad2(start.getMinutes())}` : undefined);
              const endStr = s.end ?? (end ? `${pad2(end.getHours())}:${pad2(end.getMinutes())}` : undefined);
              const shopName = s.shop?.displayName;
              const line = shopName && startStr && endStr ? `${shopName} · ${startStr}-${endStr}` : `${shopName ?? "—"} · —`;
              return (
                <li key={s.id} className="text-sm text-zinc-300">
                  {d.toLocaleDateString()} {line}
                </li>
              );
            })}
          </ul>
          <div className="text-xs text-zinc-600 mt-2">
            ※ 出勤予定は本人・関係者からの共有をもとに掲載しています。変更・不在となる場合があります。
          </div>
        </section>
      )}

      {/* Voices about */}
      {abouts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-3">Voices about this person</h2>
          <div className="space-y-4">
            {abouts.map((rec: any) => (
              <div key={rec.id} className="p-4 rounded-lg bg-zinc-900 flex gap-3 items-baseline">
                <span>
                  <a className="hover:underline font-bold" href={`/people/${rec.fromPerson.slug}`}>{rec.fromPerson.displayName}</a>
                </span>
                <span className="text-sm text-zinc-300">“{rec.body}”</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* Voices by */}
      {person.canComment && bys.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Voices by this person</h2>
          <div className="space-x-3">
            {bys.map((rec: any) =>
              <a key={rec.id} href={`/people/${rec.toPerson.slug}`} className="inline-block text-zinc-400 underline hover:text-zinc-100">{rec.toPerson.displayName}</a>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
