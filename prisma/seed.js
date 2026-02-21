const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const drinks = require("./drinks-catalog.json");

async function main() {
  const existing = await prisma.drink.count();
  if (existing > 0) {
    console.log("Drinks already seeded, skipping.");
    return;
  }
  for (const d of drinks) {
    const drink = await prisma.drink.create({
      data: {
        name: d.name,
        brand: d.brand,
        sizes: {
          create: d.sizes.map((s) => ({
            sizeLabel: s.sizeLabel,
            caffeineMg: s.caffeineMg,
          })),
        },
      },
    });
    console.log("Created", drink.name, drink.brand || "(generic)");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
