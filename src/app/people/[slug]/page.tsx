export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getPrisma } from "@/lib/prisma";
import Image from "next/image";
import { MessageSheet } from "./message-sheet";
import { peopleImageSrc, normalizePeopleImage } from "@/lib/people-image";
import { notFound } from "next/navigation";

const SHOW_SCHEDULE_UI = false; // phase0': hide Today / schedule surfaces (keep data for later)

type TodayInfo = { shop?: string; start?: string; end?: string };
type PersonLite = { slug: string; displayName: string };
type RecommendationLite = { id: string; body: string; fromPerson: PersonLite };
type RecommendedFlavor = { by: string; flavors: string; comment?: string };

function normalizeSlug(input: string | undefined) {
  return (input ?? "").trim().toLowerCase();
}

function keyForPerson(p: { slug?: string; displayName?: string } | null | undefined) {
  const n = String(p?.displayName ?? "").trim().toLowerCase();
  if (n) return `name:${n}`;
  const s = String(p?.slug ?? "").trim().toLowerCase();
  if (s) return `slug:${s}`;
  return "unknown";
}

function keyForFlavor(f: RecommendedFlavor | null | undefined) {
  const n = String(f?.by ?? "").trim().toLowerCase();
  if (n) return `name:${n}`;
  return "unknown";
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
  image: string; // filename with extension
  today?: TodayInfo;
  instagramUrl?: string;
}> = [
  { slug: "daigo", name: "Daigo", image: "/photos/people/daigo.jpg", instagramUrl: "https://www.instagram.com/issho_daigo_bro?igsh=aWNrODY0bXdwOWtu" },
  { slug: "tachiuo", name: "Tachiuo", image: "/photos/people/tachiuo.jpg", instagramUrl: "https://www.instagram.com/tachiuo2023?igsh=MXJxeDU0b2dsYzBkMA%3D%3D&utm_source=qr" },
  { slug: "alice", name: "Alice", image: "alice.svg", today: { shop: "渋谷CHIC", start: "19:00", end: "23:00" }, instagramUrl: "https://instagram.com/" },
  { slug: "ben", name: "Ben", image: "ben.svg", today: { shop: "池袋Mellow", start: "20:00", end: "24:00" } },
  { slug: "chloe", name: "Chloe", image: "chloe.svg", today: { shop: "吉祥寺Rest", start: "21:00", end: "24:00" } },
  { slug: "emi", name: "Emi", image: "emi.svg", today: { shop: "渋谷CHIC", start: "18:30", end: "22:30" } },
  { slug: "fuji", name: "Fuji", image: "fuji.svg" },
  { slug: "daisuke", name: "Daisuke", image: "daisuke.svg" },
  { slug: "haru", name: "Haru", image: "haru.svg" },
  { slug: "yuzu", name: "Yuzu", image: "yuzu.svg" },
  { slug: "taichi", name: "Taichi", image: "taichi.svg" },
  { slug: "miku", name: "Miku", image: "miku.svg" },
  { slug: "akira", name: "Akira", image: "akira.svg" },
  { slug: "rio", name: "Rio", image: "rio.svg" },
  { slug: "sena", name: "Sena", image: "sena.svg" },
  { slug: "noa", name: "Noa", image: "noa.svg" },
  { slug: "kana", name: "Kana", image: "kana.svg" },
  { slug: "ren", name: "Ren", image: "ren.svg" },
  { slug: "mei", name: "Mei", image: "mei.svg" },
  { slug: "kyo", name: "Kyo", image: "kyo.svg" },
  { slug: "suzu", name: "Suzu", image: "suzu.svg" },
  { slug: "lucas", name: "Lucas", image: "lucas.svg" },
  { slug: "aya", name: "Aya", image: "aya.svg" },
  { slug: "jin", name: "Jin", image: "jin.svg" },
  { slug: "hikari", name: "Hikari", image: "hikari.svg" },
  { slug: "leo", name: "Leo", image: "leo.svg" },
  { slug: "mina", name: "Mina", image: "mina.svg" },
];

function fallbackDataFor(slug: string | undefined) {
  const s = normalizeSlug(slug);
  const fromList = fallbackPeople.find(p => p.slug === s);
  if (!fromList) notFound();
  const candidateName = (fromList as any)?.name;
  const displayName =
    (typeof candidateName === "string" && candidateName.trim().length > 0) ? candidateName :
    (simpleNameFromSlug(s) ? simpleNameFromSlug(s) : "Anonymous");
  const image = fromList!.image;
  const today: TodayInfo = fromList?.today ?? { shop: "渋谷CHIC", start: "19:00", end: "23:00" };
  const instagramUrl = fromList?.instagramUrl ?? null;
  const recommendedFlavors: RecommendedFlavor[] =
    s === "daigo"
      ? [
          { by: "Tachiuo", flavors: "Dogma no aroma" },
          { by: "Tachiuo", flavors: "Satyr no aroma" },
          { by: "Tachiuo", flavors: "Trofimoff's no aroma" },
        ]
      : [];
  const abouts: RecommendationLite[] =
    s === "daigo"
      ? [
          {
            id: "d1",
            body:
              "フレーバーごとの解像度が高いのは言うまでもなく、伝導熱や放射熱など温度帯も完璧に計算され、吸い手との阿吽の呼吸でのその進行管理はもはや芸術の域に達している。",
            fromPerson: { slug: "tachiuo", displayName: "Tachiuo" },
          },
        ]
      : s === "tachiuo"
      ? [
          {
            id: "t1",
            body:
              "香りの輪郭が澄んでいて、余韻が静かに続く。派手に盛らず、最初から最後まで温度と空気感を揃えてくる。こちらのテンポに合わせてくれる人。",
            fromPerson: { slug: "ben", displayName: "Ben" },
          },
        ]
      : [];
  return {
    person: {
      name: displayName,
      isStaff: true,
      canComment: true,
      image,
      recommendedFlavors,
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
  if (normalizeSlug(slug) === "daigo") return fallbackDataFor(slug);
  if (!prisma) return fallbackDataFor(slug);
  try {
    const s = normalizeSlug(slug);
    const person = await prisma.person.findFirst({
      where: { slug: { equals: s, mode: "insensitive" } },
    });
    if (!person) return fallbackDataFor(slug);

    // phase0': keep "person evaluation comments" (3rd person). Mix notes are not used.
    const aboutsRaw = await prisma.recommendation.findMany({
      where: { toPersonId: person.id, isApproved: true },
      include: { fromPerson: true },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
    });
    const aboutsTop = aboutsRaw
      .filter(Boolean)
      .slice(0, 5)
      .map((rec) => ({
        id: rec.id,
        body: rec.body,
        fromPerson: { slug: rec.fromPerson.slug, displayName: rec.fromPerson.displayName },
      })) satisfies RecommendationLite[];

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
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/.test(slug)) {
    notFound();
  }
  const data = await getPersonData(slug);
  const { person, today, abouts, bys } = data as any;
  const recommendedFlavors: RecommendedFlavor[] = Array.isArray((person as any)?.recommendedFlavors) ? (person as any).recommendedFlavors : [];
  const image = normalizePeopleImage(((person as any)?.avatarUrl ?? (person as any)?.image ?? (person as any)?.imageSrc ?? "_placeholder.svg") as string);
  const imageSrc = peopleImageSrc(image);
  const displayName =
    (typeof person?.name === "string" && person.name.trim().length > 0) ? person.name :
    (simpleNameFromSlug(slug) ? simpleNameFromSlug(slug) : "Anonymous");
  const instagramUrl =
    typeof (person as any)?.instagramUrl === "string" && (person as any).instagramUrl.startsWith("http")
      ? (person as any).instagramUrl
      : null;
  const todayShop = today?.shop as string | undefined;
  const todayUrl = todayShop ? mapsSearchUrl(todayShop) : null;
  const todayMeta = getShopAndTime(today);

  // group by recommender (3rd person) to avoid "menu/self-PR" misread
  const grouped = (() => {
    const map = new Map<
      string,
      { key: string; name: string; slug?: string; flavors: RecommendedFlavor[]; voices: RecommendationLite[] }
    >();

    for (const rec of (Array.isArray(abouts) ? abouts : []) as RecommendationLite[]) {
      const k = keyForPerson(rec?.fromPerson);
      const name = rec?.fromPerson?.displayName ?? "—";
      const slug = rec?.fromPerson?.slug;
      if (!map.has(k)) map.set(k, { key: k, name, slug, flavors: [], voices: [] });
      map.get(k)!.voices.push(rec);
    }

    for (const f of recommendedFlavors) {
      const k = keyForFlavor(f);
      const name = f.by || "—";
      if (!map.has(k)) map.set(k, { key: k, name, flavors: [], voices: [] });
      const entry = map.get(k)!;
      // if we only have flavors, try to resolve slug for linking (best-effort)
      if (!entry.slug) {
        const fromFallback = fallbackPeople.find(
          (p) => String(p?.name ?? "").trim().toLowerCase() === String(name ?? "").trim().toLowerCase()
        );
        if (fromFallback?.slug) entry.slug = fromFallback.slug;
      }
      entry.flavors.push(f);
    }

    // stable order: comments first (strongest signal), then flavors-only
    return [...map.values()].sort((a, b) => (b.voices.length - a.voices.length) || a.name.localeCompare(b.name));
  })();

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
              unoptimized
            />
          </div>
        </div>

        {/* Name */}
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">{displayName}</h1>
        </header>

        {/* By recommender (3rd person) */}
        {grouped.length > 0 ? (
          <section className="mb-12">
            <div className="space-y-10">
              {grouped.map((g) => {
                const flavorsTop = g.flavors.slice(0, 5);
                return (
                  <div
                    key={g.key}
                    className="rounded-lg border border-white/10 p-6 md:p-8"
                  >
                    <div className="text-base font-semibold tracking-tight text-zinc-200">
                      From{" "}
                      {g.slug ? (
                        <a
                          href={`/people/${g.slug}`}
                          className="hover:underline underline-offset-4 decoration-zinc-700/70"
                        >
                          {g.name}
                        </a>
                      ) : (
                        <span>{g.name}</span>
                      )}
                    </div>
                    <div className="mt-4 border-t border-white/10" />

                    {flavorsTop.length > 0 ? (
                      <div className="mt-8">
                        <div className="text-xs text-zinc-500">Recommended Flavors</div>
                        <div className="mt-4 space-y-5">
                          {flavorsTop.map((f, idx) => (
                            <div key={`${g.key}-flavor-${f.flavors}-${idx}`}>
                              <div className="text-base font-medium text-zinc-100">{f.flavors}</div>
                              {f.comment ? (
                                <div className="mt-2 text-sm text-zinc-400 leading-relaxed">
                                  {f.comment}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {g.voices.length > 0 ? (
                      <div className="mt-10">
                        <div className="text-xs text-zinc-500">Comment</div>
                        <div className="mt-4 space-y-8">
                          {g.voices.slice(0, 2).map((rec) => (
                            <div key={`${g.key}-comment-${rec.id}`}>
                              <p className="whitespace-pre-wrap leading-7 text-zinc-300/90">
                                {rec.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
        {SHOW_SCHEDULE_UI ? (
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
        ) : null}

      {/* Contact */}
      <section className="mb-16">
        <h2 className="text-sm font-semibold text-zinc-400 mb-2">この人に連絡する</h2>
        <div className="text-xs text-zinc-500 mb-4">InstagramのDMで連絡できます。文面は用意されています。</div>
        <MessageSheet
          displayName={displayName}
          todayDate={new Date()}
          todayShop={todayMeta.shop === "—" ? null : todayMeta.shop}
          todayTime={todayMeta.time === "—" ? null : todayMeta.time}
          instagramUrl={instagramUrl}
        />
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
      </main>
      {SHOW_SCHEDULE_UI ? <StickyTodayBar today={today} /> : null}
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

