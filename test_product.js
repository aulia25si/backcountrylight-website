const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.product.findUnique({ where: { slug: 'testing' }, include: { options: true, variants: true } })
  .then(p => console.log(JSON.stringify(p, null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
