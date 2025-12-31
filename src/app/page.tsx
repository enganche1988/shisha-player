export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getPrisma } from "@/lib/prisma";
import { PicksWithAll } from "./picks.client";

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

type TodayRow = {
  slug: string;
  displayName: string;
  shop: string;
  start: string;
  end: string;
  lat?: number;
  lng?: number;
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

const fallbackTodayAll: TodayRow[] = [
  // Shibuya
  { slug: "alice", displayName: "Alice", shop: "渋谷CHIC", start: "19:00", end: "23:00", lat: 35.658034, lng: 139.701636 },
  { slug: "emi", displayName: "Emi", shop: "渋谷CHIC", start: "18:30", end: "22:30", lat: 35.658034, lng: 139.701636 },
  { slug: "fuji", displayName: "Fuji", shop: "渋谷CHIC", start: "21:00", end: "24:00", lat: 35.658034, lng: 139.701636 },
  { slug: "haru", displayName: "Haru", shop: "渋谷CHIC", start: "23:00", end: "24:00", lat: 35.658034, lng: 139.701636 },
  // Ikebukuro
  { slug: "ben", displayName: "Ben", shop: "池袋Mellow", start: "20:00", end: "24:00", lat: 35.729503, lng: 139.7109 },
  { slug: "daisuke", displayName: "Daisuke", shop: "池袋Mellow", start: "19:30", end: "23:30", lat: 35.729503, lng: 139.7109 },
  { slug: "yuzu", displayName: "Yuzu", shop: "池袋Mellow", start: "18:00", end: "21:00", lat: 35.729503, lng: 139.7109 },
  { slug: "taichi", displayName: "Taichi", shop: "池袋Mellow", start: "21:00", end: "24:00", lat: 35.729503, lng: 139.7109 },
  // Kichijoji
  { slug: "chloe", displayName: "Chloe", shop: "吉祥寺Rest", start: "21:00", end: "24:00", lat: 35.703152, lng: 139.57978 },
  { slug: "miku", displayName: "Miku", shop: "吉祥寺Rest", start: "19:00", end: "21:00", lat: 35.703152, lng: 139.57978 },
  { slug: "akira", displayName: "Akira", shop: "吉祥寺Rest", start: "23:00", end: "24:00", lat: 35.703152, lng: 139.57978 },
  // Add more (dummy) to exceed 20
  { slug: "rio", displayName: "Rio", shop: "渋谷CHIC", start: "19:00", end: "21:00", lat: 35.658034, lng: 139.701636 },
  { slug: "sena", displayName: "Sena", shop: "渋谷CHIC", start: "21:00", end: "23:00", lat: 35.658034, lng: 139.701636 },
  { slug: "noa", displayName: "Noa", shop: "渋谷CHIC", start: "23:00", end: "24:00", lat: 35.658034, lng: 139.701636 },
  { slug: "kana", displayName: "Kana", shop: "池袋Mellow", start: "19:00", end: "21:00", lat: 35.729503, lng: 139.7109 },
  { slug: "ren", displayName: "Ren", shop: "池袋Mellow", start: "21:00", end: "23:00", lat: 35.729503, lng: 139.7109 },
  { slug: "mei", displayName: "Mei", shop: "池袋Mellow", start: "23:00", end: "24:00", lat: 35.729503, lng: 139.7109 },
  { slug: "kyo", displayName: "Kyo", shop: "吉祥寺Rest", start: "18:00", end: "21:00", lat: 35.703152, lng: 139.57978 },
  { slug: "suzu", displayName: "Suzu", shop: "吉祥寺Rest", start: "19:00", end: "23:00", lat: 35.703152, lng: 139.57978 },
  { slug: "lucas", displayName: "Lucas", shop: "吉祥寺Rest", start: "23:00", end: "24:00", lat: 35.703152, lng: 139.57978 },
  { slug: "aya", displayName: "Aya", shop: "渋谷CHIC", start: "18:00", end: "22:00", lat: 35.658034, lng: 139.701636 },
  { slug: "jin", displayName: "Jin", shop: "渋谷CHIC", start: "19:30", end: "23:30", lat: 35.658034, lng: 139.701636 },
  { slug: "hikari", displayName: "Hikari", shop: "池袋Mellow", start: "18:30", end: "22:30", lat: 35.729503, lng: 139.7109 },
  { slug: "leo", displayName: "Leo", shop: "池袋Mellow", start: "20:30", end: "24:00", lat: 35.729503, lng: 139.7109 },
  { slug: "mina", displayName: "Mina", shop: "吉祥寺Rest", start: "21:30", end: "24:00", lat: 35.703152, lng: 139.57978 },
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

async function getTodayAll(): Promise<TodayRow[]> {
  const prisma = getPrisma();
  if (!prisma) return fallbackTodayAll;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shifts = await prisma.shift.findMany({
      where: { date: today },
      include: { person: true, shop: true },
    });
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const rows: TodayRow[] = shifts.map((s) => {
      const start = s.startTime ? new Date(s.startTime) : null;
      const end = s.endTime ? new Date(s.endTime) : null;
      const startStr = start ? `${pad2(start.getHours())}:${pad2(start.getMinutes())}` : "—";
      const endStr = end ? `${pad2(end.getHours())}:${pad2(end.getMinutes())}` : "—";
      const shopName = s.shop?.displayName ?? "—";
      // crude coordinate mapping for MVP (fallback to undefined)
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
      };
    });
    return rows;
  } catch {
    return fallbackTodayAll;
  }
}

export default async function HomePage() {
  const picks = await getTodaysPicks();
  const todayAll = await getTodayAll();
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-full max-w-xl px-4 py-10">
        <PicksWithAll picks={picks} todayAll={todayAll} />
      </div>
    </main>
  );
}
