import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const rect = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

const daysFromNow = (d: number) => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date;
};

async function main() {
  // Idempotent: wipe in FK-safe order.
  await prisma.invoice.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.building.deleteMany();
  await prisma.tenant.deleteMany();

  // Bootstrap admin (idempotent by email). Credentials come from env.
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@rent.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: 'ADMIN', name: 'Admin' },
    create: { email: adminEmail, passwordHash, role: 'ADMIN', name: 'Admin' },
  });

  const building = await prisma.building.create({
    data: { name: 'BC Aurora', address: 'Almaty, Al-Farabi Ave 77' },
  });

  const floor = await prisma.floor.create({
    data: { buildingId: building.id, floorNumber: 3, planImageUrl: '/plans/floor-demo.svg' },
  });

  const [alpha, beta, gamma] = await Promise.all([
    prisma.tenant.create({
      data: { companyName: 'Alpha Logistics', email: 'office@alpha.kz', phone: '+7 701 000 0001' },
    }),
    prisma.tenant.create({
      data: { companyName: 'Beta Studio', email: 'hello@beta.kz', phone: '+7 701 000 0002' },
    }),
    prisma.tenant.create({
      data: { companyName: 'Gamma Coffee', email: 'team@gamma.kz', phone: '+7 701 000 0003' },
    }),
  ]);

  const mk = (
    roomNumber: string,
    coords: { x: number; y: number }[],
    area: number,
    basePrice: number,
    currentStatus: 'FREE' | 'BOOKED' | 'OCCUPIED' | 'OVERDUE' | 'REPAIR',
  ) =>
    prisma.room.create({
      data: { floorId: floor.id, roomNumber, polygonCoordinates: coords, area, basePrice, currentStatus },
    });

  const r101 = await mk('301-A', rect(0.06, 0.08, 0.32, 0.45), 42, 9500, 'FREE');
  const r102 = await mk('301-B', rect(0.37, 0.08, 0.63, 0.45), 55, 11000, 'OCCUPIED');
  const r103 = await mk('301-C', rect(0.68, 0.08, 0.94, 0.45), 48, 10250, 'OVERDUE');
  const r104 = await mk('302-A', rect(0.06, 0.55, 0.32, 0.92), 38, 8800, 'BOOKED');
  const r105 = await mk('302-B', rect(0.37, 0.55, 0.63, 0.92), 60, 12500, 'REPAIR');
  const r106 = await mk('302-C', rect(0.68, 0.55, 0.94, 0.92), 50, 10800, 'OCCUPIED');

  // Active contracts on occupied / overdue rooms.
  const cBeta = await prisma.contract.create({
    data: {
      roomId: r102.id,
      tenantId: beta.id,
      startDate: daysFromNow(-120),
      endDate: daysFromNow(245),
      isActive: true,
    },
  });
  const cAlpha = await prisma.contract.create({
    data: {
      roomId: r103.id,
      tenantId: alpha.id,
      startDate: daysFromNow(-90),
      endDate: daysFromNow(275),
      isActive: true,
    },
  });
  const cGamma = await prisma.contract.create({
    data: {
      roomId: r106.id,
      tenantId: gamma.id,
      startDate: daysFromNow(-30),
      endDate: daysFromNow(335),
      isActive: true,
    },
  });

  await prisma.invoice.createMany({
    data: [
      // 301-B paid up.
      { contractId: cBeta.id, amount: 11000 * 55, dueDate: daysFromNow(-10), status: 'PAID' },
      // 301-C past due → drives the OVERDUE status.
      { contractId: cAlpha.id, amount: 10250 * 48, dueDate: daysFromNow(-3), status: 'UNPAID' },
      // 302-C upcoming.
      { contractId: cGamma.id, amount: 10800 * 50, dueDate: daysFromNow(4), status: 'UNPAID' },
    ],
  });

  console.log('Seed done:');
  console.log(`  admin=${adminEmail} (password from ADMIN_PASSWORD)`);
  console.log(`  building=${building.id} floor=${floor.id}`);
  console.log(`  rooms=6 tenants=3 contracts=3 invoices=3`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
