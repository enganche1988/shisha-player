import { PrismaClient, ShiftType, EndorsementStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Staffs
  const staffs = await prisma.staff.createMany({
    data: [
      { slug: 'akira', displayName: 'Akira', bio: 'おしゃれなシーシャバーテンダー', baseCity: '東京', styleTags: ['クラシック','フルー'] , instagramHandle: 'akira_shisha' },
      { slug: 'miku', displayName: 'Miku', bio: 'molasses master', baseCity: '大阪', styleTags: ['ミクスチャー'], instagramHandle: 'miku_hookah' },
      { slug: 'taichi', displayName: 'Taichi', bio: 'ゲスト系', baseCity: '京都', styleTags: ['ゲスト'] },
      { slug: 'yuzu', displayName: 'Yuzu', baseCity: '名古屋', styleTags: ['ミント'] },
      { slug: 'haru', displayName: 'Haru', baseCity: '福岡', styleTags: ['シトラス', 'クラシック'], instagramHandle: 'haru_pipe' },
      { slug: 'emily', displayName: 'Emily', baseCity: '札幌', styleTags: ['スパイス'] },
    ]
  });

  // 2. Venues
  const venues = await prisma.venue.createMany({
    data: [
      { slug: 'cloud-nine', name: 'Cloud Nine', area: '渋谷', city: '東京', instagramHandle: 'cloudnine_shibuya' },
      { slug: 'genie', name: 'Genie', area: '心斎橋', city: '大阪', instagramHandle: 'genie_osaka' },
      { slug: 'nectar', name: 'Nectar', area: '中区', city: '名古屋', instagramHandle: 'nectar_nagoya' },
    ]
  });

  // 3. Get inserted IDs
  const staffObjs = await prisma.staff.findMany();
  const venueObjs = await prisma.venue.findMany();

  // 4. Shifts (10件, ランダム日付)
  function randomDate(daysRange: number) {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * daysRange));
    return date;
  }

  for (let i = 0; i < 10; i++) {
    await prisma.shift.create({
      data: {
        staffId: staffObjs[Math.floor(Math.random() * staffObjs.length)].id,
        venueId: venueObjs[Math.floor(Math.random() * venueObjs.length)].id,
        shiftType: [ShiftType.REGULAR, ShiftType.GUEST, ShiftType.COLLAB][Math.floor(Math.random()*3)],
        startAt: randomDate(7),
        note: '例・出勤情報',
        sourceUrl: 'https://instagram.com/post/'+Math.random(),
      }
    });
  }

  // 5. PostLinks (12件, ダミーURL)
  for (let i = 0; i < 12; i++) {
    await prisma.postLink.create({
      data: {
        staffId: staffObjs[Math.floor(Math.random() * staffObjs.length)].id,
        url: `https://instagram.com/dummy/${i}`,
        caption: `ダミー${i} キャプション`,
        postedAt: randomDate(30),
      }
    });
  }

  // 6. Endorsements (10件, APPROVED/PENDING)
  for (let i = 0; i < 10; i++) {
    const fromStaff = staffObjs[Math.floor(Math.random() * staffObjs.length)];
    let toStaff = staffObjs[Math.floor(Math.random() * staffObjs.length)];
    while (toStaff.id === fromStaff.id) {
      toStaff = staffObjs[Math.floor(Math.random() * staffObjs.length)];
    }
    await prisma.endorsement.create({
      data: {
        fromStaffId: fromStaff.id,
        toStaffId: toStaff.id,
        status: [EndorsementStatus.APPROVED, EndorsementStatus.PENDING][Math.floor(Math.random()*2)],
        body: '素晴らしいシーシャスキルを持ったスタッフです。',
        skillTags: ['親切', '上手い'],
        sourceUrl: 'https://instagram.com/recommend/'+Math.random(),
      }
    });
  }
}

main().catch(e => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});




