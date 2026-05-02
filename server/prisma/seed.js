const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Orbis database...');

  const ownerHash = await bcrypt.hash('admin123', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@orbis.com' },
    update: {},
    create: { email: 'owner@orbis.com', password: ownerHash, name: 'System Owner', role: 'OWNER' },
  });

  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@orbis.com' },
    update: {},
    create: { email: 'admin@orbis.com', password: adminHash, name: 'Super Admin', role: 'SUPER_ADMIN' },
  });

  const coordHash = await bcrypt.hash('coord123', 12);
  const coord = await prisma.user.upsert({
    where: { email: 'coord@orbis.com' },
    update: {},
    create: { email: 'coord@orbis.com', password: coordHash, name: 'Political Coordinator', role: 'POLITICAL_COORDINATOR' },
  });

  const areas = [
    { name: 'Territory Management', type: 'territorial', color: '#10B981', description: 'Handles all territorial operations' },
    { name: 'Communications', type: 'communication', color: '#3B82F6', description: 'Media and public communications' },
    { name: 'Legislative Affairs', type: 'legislative', color: '#8B5CF6', description: 'Legislative processes and expedientes' },
    { name: 'Operations', type: 'operations', color: '#F59E0B', description: 'Day-to-day operational management' },
  ];

  for (const a of areas) {
    const area = await prisma.area.upsert({
      where: { id: a.name.toLowerCase().replace(/\s/g, '-') },
      update: {},
      create: { ...a },
    }).catch(() => prisma.area.create({ data: a }));

    await prisma.channel.create({
      data: { name: `#${a.name.toLowerCase().replace(/\s/g, '-')}`, type: 'area', areaId: area.id },
    }).catch(() => {});
  }

  console.log('Seed complete.');
  console.log('Owner: owner@orbis.com / admin123');
  console.log('Admin: admin@orbis.com / admin123');
  console.log('Coordinator: coord@orbis.com / coord123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
