import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_SERVICES = [
  { id: 's1', name: 'Corte de Caballero', description: 'Corte clásico o moderno con lavado incluido.', durationMinutes: 30, price: 15, isActive: true },
  { id: 's2', name: 'Corte de Dama', description: 'Asesoría de imagen, corte y secado.', durationMinutes: 60, price: 25, isActive: true },
  { id: 's3', name: 'Barba y Afeitado', description: 'Perfilado de barba con toalla caliente.', durationMinutes: 30, price: 12, isActive: true },
  { id: 's4', name: 'Manicure Spa', description: 'Limpieza, exfoliación y esmaltado.', durationMinutes: 45, price: 20, isActive: true },
  { id: 's5', name: 'Tinte y Color', description: 'Aplicación de tinte completo.', durationMinutes: 120, price: 60, isActive: true },
];

const MOCK_BRANCHES = [
  { 
    id: 'b1', name: 'Sucursal Sabaneta', address: 'Av. Las Vegas 77 Sur', imageUrl: 'https://picsum.photos/400/200?random=1',
    serviceIds: ['s1', 's2', 's3', 's4', 's5'], 
    lat: 6.1507,
    lng: -75.6167
  },
  { 
    id: 'b2', name: 'Sucursal Itagüí', address: 'Calle 50 #40-23', imageUrl: 'https://picsum.photos/400/200?random=2',
    serviceIds: ['s1', 's2', 's3'], 
    lat: 6.1719,
    lng: -75.6114
  },
  { 
    id: 'b3', name: 'Sucursal Envigado', address: 'Transversal 32A Sur', imageUrl: 'https://picsum.photos/400/200?random=3',
    serviceIds: ['s1', 's3', 's4'], 
    lat: 6.1759,
    lng: -75.5917
  },
];

const createStandardSchedule = (start = 8, end = 19, daysOff = [0]) => {
  const schedule = [];
  for (let i = 0; i < 7; i++) {
    const isOff = daysOff.includes(i);
    if (!isOff) {
      schedule.push({
        dayOfWeek: i,
        startTime: `${start}:00`,
        endTime: `${end}:00`,
        isWorkDay: true
      });
    } else {
        schedule.push({
            dayOfWeek: i,
            startTime: "00:00",
            endTime: "00:00",
            isWorkDay: false
        });
    }
  }
  return schedule;
};

const MOCK_EMPLOYEES = [
  { 
    id: 'e1', name: 'Ana García', branchId: 'b1', roleLabel: 'Estilista Senior', 
    avatarUrl: 'https://picsum.photos/100/100?random=1', 
    serviceIds: ['s1', 's2', 's5']
  },
  { 
    id: 'e2', name: 'Carlos Ruiz', branchId: 'b1', roleLabel: 'Asistente', 
    avatarUrl: 'https://picsum.photos/100/100?random=2', 
    serviceIds: ['s1', 's3']
  },
  { 
    id: 'e3', name: 'Elena Torres', branchId: 'b1', roleLabel: 'Especialista', 
    avatarUrl: 'https://picsum.photos/100/100?random=3', 
    serviceIds: ['s4']
  },
  { 
    id: 'e4', name: 'David M.', branchId: 'b2', roleLabel: 'Gerente', 
    avatarUrl: 'https://picsum.photos/100/100?random=4', 
    serviceIds: ['s1', 's2', 's3']
  },
  { 
    id: 'e5', name: 'Sofia L.', branchId: 'b2', roleLabel: 'Estilista', 
    avatarUrl: 'https://picsum.photos/100/100?random=5', 
    serviceIds: ['s2', 's5']
  },
  { 
    id: 'e6', name: 'Marcos P.', branchId: 'b2', roleLabel: 'Asistente', 
    avatarUrl: 'https://picsum.photos/100/100?random=6', 
    serviceIds: ['s1']
  },
  { 
    id: 'e7', name: 'Lucia R.', branchId: 'b3', roleLabel: 'Estilista', 
    avatarUrl: 'https://picsum.photos/100/100?random=7', 
    serviceIds: ['s1', 's4']
  },
  { 
    id: 'e8', name: 'Jorge B.', branchId: 'b3', roleLabel: 'Barbero', 
    avatarUrl: 'https://picsum.photos/100/100?random=8', 
    serviceIds: ['s1', 's3']
  },
  { 
    id: 'e9', name: 'Patricia S.', branchId: 'b3', roleLabel: 'Manicurista', 
    avatarUrl: 'https://picsum.photos/100/100?random=9', 
    serviceIds: ['s4']
  },
];

async function main() {
  console.log('Start seeding ...');

  // 1. Services
  for (const s of MOCK_SERVICES) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        price: s.price,
        isActive: s.isActive
      },
    });
  }

  // 2. Branches & BranchServices
  for (const b of MOCK_BRANCHES) {
    await prisma.branch.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        name: b.name,
        address: b.address,
        imageUrl: b.imageUrl,
        lat: b.lat,
        lng: b.lng,
        isActive: true,
      },
    });

    // Link services
    for (const sid of b.serviceIds) {
      await prisma.branchService.upsert({
        where: { branchId_serviceId: { branchId: b.id, serviceId: sid } },
        update: {},
        create: { branchId: b.id, serviceId: sid }
      });
    }
  }

  // 3. Employees & Schedules & EmployeeServices
  for (const e of MOCK_EMPLOYEES) {
    await prisma.employee.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        branchId: e.branchId,
        name: e.name,
        roleLabel: e.roleLabel,
        avatarUrl: e.avatarUrl,
        isActive: true,
      },
    });

    // Link services
    for (const sid of e.serviceIds) {
      await prisma.employeeService.upsert({
        where: { employeeId_serviceId: { employeeId: e.id, serviceId: sid } },
        update: {},
        create: { employeeId: e.id, serviceId: sid }
      });
    }

    // Schedules (Simplified: Standard 9-18 for everyone for now)
    const schedules = createStandardSchedule();
    for (const sch of schedules) {
        // Check if exists logic omitted for simplicity, just create if not exists
        // Ideally we should use upsert but Schedule doesn't have a unique compound key in schema easily accessible without ID
        // So we delete and recreate or just ignore for MVP seed
        const count = await prisma.schedule.count({ where: { employeeId: e.id, dayOfWeek: sch.dayOfWeek }});
        if (count === 0) {
            await prisma.schedule.create({
                data: {
                    employeeId: e.id,
                    dayOfWeek: sch.dayOfWeek,
                    startTime: sch.startTime,
                    endTime: sch.endTime,
                    isWorkDay: sch.isWorkDay
                }
            });
        }
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
