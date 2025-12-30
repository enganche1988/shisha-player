import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

// 派生値
async function getPersonData(slug: string) {
  const person = await prisma.person.findUnique({ where: { slug } });
  if (!person) return null;

  const aboutsRaw = await prisma.recommendation.findMany({
    where: { toPersonId: person.id, isApproved: true },
    include: { fromPerson: true },
    orderBy: [{ createdAt: "desc" }]
  });
  const abouts = await Promise.all(
    aboutsRaw.map(async rec => ({
      ...rec,
      fromPersonReceivedCount:
        await prisma.recommendation.count({ where: { toPersonId: rec.fromPersonId, isApproved: true } })
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
}

export default async function PeopleDetail({ params }: { params: { slug: string } }) {
  const data = await getPersonData(params.slug);
  if (!data) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-500">
      <div className="text-lg">Currently not listed</div>
    </main>
  );
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
            {weekShifts.map(s => (
              <li key={s.id} className="flex items-center gap-3">
                <span>{s.shop.area}&nbsp;{s.shop.displayName}</span>
                <span className="text-xs text-zinc-500">
                  {s.date.toLocaleDateString()} {s.startTime && `${new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}〜`}
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
            {bys.map(rec =>
              <a key={rec.id} href={`/people/${rec.toPerson.slug}`} className="inline-block text-zinc-400 underline hover:text-zinc-100">{rec.toPerson.displayName}</a>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

