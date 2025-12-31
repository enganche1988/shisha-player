export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getPrisma } from "@/lib/prisma";
import Image from "next/image";

type TodayInfo = { shop?: string; start?: string; end?: string };
type PersonLite = { slug: string; displayName: string };
type RecommendationLite = { id: string; body: string; fromPerson: PersonLite };

function normalizeSlug(input: string | undefined) {
  return (input ?? "").trim().toLowerCase();
}

function simpleNameFromSlug(slug: string) {
  const s = (slug ?? "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getShopAndTime(today: TodayInfo | undefined): { shop: string; time: string } {
  const shop = today?.shop ?? "—";
  const start = today?.start;
  const end = today?.end;
  const time = start && end ? `${start}-${end}` : "—";
  return { shop, time };
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function mapsSearchUrl(shopName: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shopName)}`;
}

function tierFor(slug: string | undefined): "Ⅰ" | "Ⅱ" | "Ⅲ" | null {
  if (!slug) return null;
  const map: Record<string, "Ⅰ" | "Ⅱ" | "Ⅲ"> = {
    emi: "Ⅰ",
    fuji: "Ⅱ",
    chloe: "Ⅲ",
  };
  return map[slug] ?? null;
}

const fallbackPeople: Array<{
  slug: string;
  name: string;
  imageSrc?: string;
  today?: TodayInfo;
  instagramUrl?: string;
}> = [
  { slug: "alice", name: "Alice", imageSrc: "/people/alice.svg", today: { shop: "渋谷CHIC", start: "19:00", end: "23:00" }, instagramUrl: "https://instagram.com/" },
  { slug: "ben", name: "Ben", imageSrc: "/people/ben.svg", today: { shop: "池袋Mellow", start: "20:00", end: "24:00" } },
  { slug: "chloe", name: "Chloe", today: { shop: "吉祥寺Rest", start: "21:00", end: "24:00" } },
  { slug: "emi", name: "Emi", today: { shop: "渋谷CHIC", start: "18:30", end: "22:30" } },
  { slug: "fuji", name: "Fuji" },
  { slug: "daisuke", name: "Daisuke" },
];

function fallbackDataFor(slug: string | undefined) {
  const s = normalizeSlug(slug);
  const fromList = fallbackPeople.find(p => p.slug === s);
  const candidateName = (fromList as any)?.name;
  const displayName =
    (typeof candidateName === "string" && candidateName.trim().length > 0) ? candidateName :
    (simpleNameFromSlug(s) ? simpleNameFromSlug(s) : "Anonymous");
  const imageSrc = fromList?.imageSrc ?? null;
  const today: TodayInfo = fromList?.today ?? { shop: "渋谷CHIC", start: "19:00", end: "23:00" };
  const instagramUrl = fromList?.instagramUrl ?? null;
  const abouts: RecommendationLite[] = [
    {
      id: "r1",
      body:
        "香りの立ち上がりが静かで、輪郭が最後まで崩れない。混ぜ物を増やさずに深さだけを出せるタイプ。熱の扱いが上手く、同じ構成でも日によって“今日の一番”に寄せてくる。",
      fromPerson: { slug: "ben", displayName: "Ben" },
    },
    {
      id: "r2",
      body:
        "甘さを足さずに余韻を伸ばす。派手さではなく、吸い終わりの空気感まで設計している。初手が強いだけの人ではなく、後半の静けさが続く。",
      fromPerson: { slug: "emi", displayName: "Emi" },
    },
    {
      id: "r3",
      body:
        "香りの層が薄くならない。ベースが透明で、上に乗る要素が濁らない。雑に強くしない、弱くしない。手数ではなく制御で勝つ人。",
      fromPerson: { slug: "fuji", displayName: "Fuji" },
    },
    {
      id: "r4",
      body:
        "“上手い”の説明が要らないタイプ。こちらの気分に合わせて角度を変える。言葉より、仕上がりで黙らせてくる。",
      fromPerson: { slug: "chloe", displayName: "Chloe" },
    },
  ];
  return {
    person: {
      name: displayName,
      isStaff: true,
      canComment: true,
      imageSrc,
      instagramUrl,
    },
    today,
    abouts,
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
    const s = normalizeSlug(slug);
    const person = await prisma.person.findFirst({
      where: { slug: { equals: s, mode: "insensitive" } },
    });
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
    const aboutsTop = abouts.filter(Boolean).slice(0, 5);

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

    return { person, today: todayInfo, abouts: aboutsTop, bys };
  } catch {
    return fallbackDataFor(slug);
  }
}

type PeoplePageParams = { slug?: string };

export default async function PeopleDetail({ params }: { params: PeoplePageParams | Promise<PeoplePageParams> }) {
  const resolvedParams = await Promise.resolve(params);
  const slug = normalizeSlug(resolvedParams?.slug);
  const data = await getPersonData(slug);
  const { person, today, abouts, bys } = data as any;
  const derived = slug ? `/people/${slug}.svg` : null;
  const imageSrc: string =
    (typeof (person as any)?.imageSrc === "string" && (person as any).imageSrc.startsWith("/"))
      ? (person as any).imageSrc
      : (derived ?? "/people/_placeholder.svg");
  const displayName =
    (typeof person?.name === "string" && person.name.trim().length > 0) ? person.name :
    (simpleNameFromSlug(slug) ? simpleNameFromSlug(slug) : "Anonymous");
  const instagramUrl =
    typeof (person as any)?.instagramUrl === "string" && (person as any).instagramUrl.startsWith("http")
      ? (person as any).instagramUrl
      : null;
  const todayShop = today?.shop as string | undefined;
  const todayUrl = todayShop ? mapsSearchUrl(todayShop) : null;

  return (
    <>
      <main className="min-h-screen bg-black text-zinc-100 py-10 px-4 pb-28 max-w-2xl mx-auto">
        {/* Image (quiet exhibit) */}
        <div className="mb-10">
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-md bg-zinc-950">
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover opacity-90"
              priority={false}
            />
          </div>
        </div>

        {/* Name */}
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            {displayName}
            <span className="ml-3 text-xs text-zinc-500">
              (param:{String(resolvedParams?.slug)} / norm:{String(slug)})
            </span>
          </h1>
        </header>

        {/* この人について (main) */}
        {abouts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold mb-8">この人について</h2>
            <div className="divide-y divide-zinc-800/50">
              {abouts.map((rec: any) => (
                <article key={rec.id} className="py-10">
                  <p className="whitespace-pre-wrap leading-8 text-zinc-200">
                    {rec.body}
                  </p>
                  <div className="mt-6 text-sm text-zinc-400">
                    —{" "}
                  <a
                    className="font-medium text-zinc-200/90 hover:underline underline-offset-4 decoration-zinc-700/70"
                    href={`/people/${rec.fromPerson.slug}`}
                  >
                    {rec.fromPerson.displayName}
                  </a>
                    {(() => {
                      const tier = tierFor(rec.fromPerson?.slug);
                      if (!tier) return null;
                      const tierClass =
                        tier === "Ⅰ" ? "text-emerald-200/70" : "text-zinc-500/80";
                      return (
                        <span className={`ml-2 text-xs ${tierClass}`}>
                          {tier}
                        </span>
                      );
                    })()}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Today */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Today</h2>
          {todayUrl ? (
            <a
              href={todayUrl}
              target="_blank"
              rel="noopener noreferrer"
            className="group -mx-2 flex items-baseline justify-between gap-4 rounded-md px-2 py-3 text-sm text-zinc-300 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700/60"
            >
            <span className="min-w-0 truncate text-base font-medium text-zinc-200 group-hover:underline group-hover:decoration-zinc-700/70 underline-offset-4">
              {getShopAndTime(today).shop}
            </span>
            <span className="whitespace-nowrap font-mono tabular-nums text-sm text-zinc-400">
              {getShopAndTime(today).time}
              <span className="ml-2 text-zinc-500">›</span>
            </span>
            </a>
          ) : (
            <div className="flex items-baseline justify-between gap-4 text-sm text-zinc-300">
              <span className="min-w-0 truncate">{getShopAndTime(today).shop}</span>
              <span className="whitespace-nowrap font-mono tabular-nums">{getShopAndTime(today).time}</span>
            </div>
          )}
        </section>

        {/* この人が選ぶ人 (navigation, subtle) */}
        {person.canComment && bys.length > 0 && (
          <section className="mt-16">
          <h2 className="text-sm font-semibold text-zinc-500 mb-4">この人が選ぶ人</h2>
          <ul className="space-y-3">
            {[...bys]
              .sort((a: any, b: any) => String(a?.toPerson?.slug ?? "").localeCompare(String(b?.toPerson?.slug ?? "")))
              .map((rec: any) => {
                const tier = tierFor(rec?.toPerson?.slug);
                return (
                  <li key={rec.id}>
                    <a
                      href={`/people/${rec.toPerson.slug}`}
                      className="text-sm text-zinc-400 hover:text-zinc-300 hover:underline underline-offset-4 decoration-zinc-700/70 focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-4"
                    >
                      {rec.toPerson.displayName}
                      {tier ? <span className="ml-2 text-xs text-zinc-500">{tier}</span> : null}
                    </a>
                  </li>
                );
              })}
          </ul>
          </section>
        )}

      {/* Instagram (single, quiet) */}
      {instagramUrl ? (
        <section className="mt-14">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:underline underline-offset-4 decoration-zinc-700/70"
          >
            Instagram
          </a>
        </section>
      ) : null}
      </main>
      <StickyTodayBar today={today} />
    </>
  );
}

export function StickyTodayBar({ today }: { today: TodayInfo | undefined }) {
  const hasToday = Boolean(today?.shop && today?.start && today?.end);
  if (!hasToday) return null;
  const shop = today!.shop!;
  const url = mapsSearchUrl(shop);
  const time = `${today!.start}-${today!.end}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-0 left-0 right-0 border-t border-zinc-800/50 bg-black/80 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-2xl items-baseline justify-between gap-4 px-4 py-3 text-sm text-zinc-300">
        <span className="min-w-0 truncate">{shop}</span>
        <span className="whitespace-nowrap font-mono tabular-nums">{time}</span>
      </div>
    </a>
  );
}
