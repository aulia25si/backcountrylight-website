const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
prisma.product.findMany({ select: { slug: true, name: true, id: true } })
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
