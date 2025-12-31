export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getPrisma } from "@/lib/prisma";

function fallbackDataFor(slug: string | undefined) {
  const s = typeof slug === "string" && slug.length > 0 ? slug : "anonymous";
  const simpleName = s.charAt(0).toUpperCase() + s.slice(1);
  return {
    person: {
      displayName: simpleName,
      isStaff: true,
      canComment: true,
    },
    abouts: [
      { id: "b", fromPerson: { slug: "ben", displayName: "Ben" }, body: "Creativity!" }
    ],
    weekShifts: [
      { id: "s", shop: { area: "渋谷", displayName: "渋谷CHIC" }, date: new Date() }
    ],
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

    return { person, abouts: aboutsTop, weekShifts, bys };
  } catch {
    return fallbackDataFor(slug);
  }
}

export default async function PeopleDetail({ params }: { params: { slug?: string } }) {
  const data = await getPersonData(params?.slug);
  const { person, abouts, weekShifts, bys } = data;

  return (
    <main className="min-h-screen bg-black text-zinc-100 py-10 px-4 max-w-2xl mx-auto">
      {/* Voices about */}
      {abouts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-3">Voices about this person</h2>
          <div className="space-y-4">
            {abouts.map(rec => (
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
      {/* Today / This Week */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-3">Today / This Week</h2>
        {person.isStaff && weekShifts.length > 0 ? (
          <ul className="space-y-2">
            {weekShifts.map((s: any) => (
              <li key={s.id} className="flex items-center gap-3">
                <span>{s.shop.area}&nbsp;{s.shop.displayName}</span>
                <span className="text-xs text-zinc-500">
                  {s.date instanceof Date ? s.date.toLocaleDateString() : new Date(s.date).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-zinc-500">Currently not listed</div>
        )}
        <div className="text-xs text-zinc-600 mt-2">
          ※ 出勤予定は本人・関係者からの共有をもとに掲載しています。変更・不在となる場合があります。
        </div>
      </section>
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
