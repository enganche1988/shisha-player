import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function makeStart(date: Date, h: number, m: number = 0) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
}

async function main() {
  // 削除: 子→親の順
  await prisma.instagramPost.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.user.deleteMany();
  await prisma.person.deleteMany();
  await prisma.shop.deleteMany();

  // 1. Person 6人
  const peopleRaw = [
    { slug: "alice", displayName: "Alice", isStaff: true, canComment: true, avatarUrl: "/people/alice.svg" },
    { slug: "ben", displayName: "Ben", isStaff: true, canComment: true, avatarUrl: "/people/ben.svg" },
    { slug: "chloe", displayName: "Chloe", isStaff: true, canComment: false, avatarUrl: "/people/chloe.svg" },
    { slug: "daisuke", displayName: "Daisuke", isStaff: true, canComment: false, avatarUrl: "/people/daisuke.svg" },
    { slug: "emi", displayName: "Emi", isStaff: false, canComment: true, avatarUrl: "/people/emi.svg" },
    { slug: "fuji", displayName: "Fuji", isStaff: false, canComment: true, avatarUrl: "/people/fuji.svg" }
  ];
  const people = await Promise.all(peopleRaw.map(p => prisma.person.create({ data: p })));

  // 2. Shop 3つ
  const shopObjs = await Promise.all([
    prisma.shop.create({ data: { slug: "shibuya-chic", displayName: "渋谷CHIC", area: "渋谷" } }),
    prisma.shop.create({ data: { slug: "ikebukuro-mellow", displayName: "池袋Mellow", area: "池袋" } }),
    prisma.shop.create({ data: { slug: "kichijoji-rest", displayName: "吉祥寺Rest", area: "吉祥寺" } }),
  ]);

  // 3. Shift 本日2〜3＋今週少し
  const today = startOfDay(new Date());
  const week = [0,1,2,3,4,5,6].map(i => addDays(today, i));
  await Promise.all([
    prisma.shift.create({ data: { personId: people[0].id, shopId: shopObjs[0].id, date: week[0], startTime: makeStart(week[0], 19) } }),
    prisma.shift.create({ data: { personId: people[1].id, shopId: shopObjs[1].id, date: week[0], startTime: makeStart(week[0], 20) } }),
    prisma.shift.create({ data: { personId: people[2].id, shopId: shopObjs[2].id, date: week[2], startTime: makeStart(week[2], 21) } }),
    prisma.shift.create({ data: { personId: people[3].id, shopId: shopObjs[2].id, date: week[3], startTime: makeStart(week[3], 20) } }),
  ]);

  // 4. Recommendation 10件（Benが多く被推薦される構造を作る）
  const p = people;
  const recs = [
    { fromPersonId: p[1].id, toPersonId: p[0].id, isApproved: true, body: "Creativity!" },
    { fromPersonId: p[2].id, toPersonId: p[0].id, isApproved: true, body: "Skillful" },
    { fromPersonId: p[0].id, toPersonId: p[1].id, isApproved: true, body: "Knowledgeable!" },
    { fromPersonId: p[2].id, toPersonId: p[1].id, isApproved: true, body: "Great collab" },
    { fromPersonId: p[3].id, toPersonId: p[1].id, isApproved: true, body: "Solid style" },
    { fromPersonId: p[4].id, toPersonId: p[1].id, isApproved: true, body: "Trustworthy" },
    { fromPersonId: p[1].id, toPersonId: p[2].id, isApproved: true, body: "Cool" },
    { fromPersonId: p[5].id, toPersonId: p[2].id, isApproved: true, body: "Fresh" },
    { fromPersonId: p[0].id, toPersonId: p[3].id, isApproved: true, body: "Gentle" },
    { fromPersonId: p[5].id, toPersonId: p[4].id, isApproved: true, body: "Honest" }
  ];
  for (const rec of recs) await prisma.recommendation.create({ data: rec });

  // 5. User & Favorite
  const user = await prisma.user.create({ data: { email: "sample@example.com" } });
  await prisma.favorite.createMany({
    data: [
      { userId: user.id, personId: p[0].id },
      { userId: user.id, personId: p[1].id }
    ]
  });
}

main().catch(e => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
