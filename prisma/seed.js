const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const drinks = [
  {
    name: "Pike Place Roast",
    brand: "Starbucks",
    sizes: [
      { sizeLabel: "Short (8 oz)", caffeineMg: 155 },
      { sizeLabel: "Tall (12 oz)", caffeineMg: 235 },
      { sizeLabel: "Grande (16 oz)", caffeineMg: 310 },
      { sizeLabel: "Venti (20 oz)", caffeineMg: 410 },
    ],
  },
  {
    name: "Caffe Latte",
    brand: "Starbucks",
    sizes: [
      { sizeLabel: "Short", caffeineMg: 75 },
      { sizeLabel: "Tall", caffeineMg: 75 },
      { sizeLabel: "Grande", caffeineMg: 150 },
      { sizeLabel: "Venti", caffeineMg: 150 },
    ],
  },
  {
    name: "Caffe Americano",
    brand: "Starbucks",
    sizes: [
      { sizeLabel: "Tall", caffeineMg: 150 },
      { sizeLabel: "Grande", caffeineMg: 225 },
      { sizeLabel: "Venti", caffeineMg: 300 },
    ],
  },
  {
    name: "Cold Brew",
    brand: "Starbucks",
    sizes: [
      { sizeLabel: "Tall", caffeineMg: 155 },
      { sizeLabel: "Grande", caffeineMg: 205 },
      { sizeLabel: "Venti", caffeineMg: 310 },
    ],
  },
  {
    name: "Blonde Roast",
    brand: "Starbucks",
    sizes: [
      { sizeLabel: "Tall", caffeineMg: 270 },
      { sizeLabel: "Grande", caffeineMg: 360 },
      { sizeLabel: "Venti", caffeineMg: 475 },
    ],
  },
  {
    name: "Espresso",
    brand: "Starbucks",
    sizes: [
      { sizeLabel: "Solo (1 shot)", caffeineMg: 75 },
      { sizeLabel: "Doppio (2 shots)", caffeineMg: 150 },
    ],
  },
  {
    name: "Drip coffee",
    brand: null,
    sizes: [
      { sizeLabel: "Small (8 oz)", caffeineMg: 95 },
      { sizeLabel: "Medium (12 oz)", caffeineMg: 140 },
      { sizeLabel: "Large (16 oz)", caffeineMg: 185 },
    ],
  },
  {
    name: "Espresso",
    brand: null,
    sizes: [
      { sizeLabel: "Single shot", caffeineMg: 64 },
      { sizeLabel: "Double shot", caffeineMg: 128 },
    ],
  },
  {
    name: "Black tea",
    brand: null,
    sizes: [
      { sizeLabel: "8 oz", caffeineMg: 47 },
      { sizeLabel: "12 oz", caffeineMg: 70 },
    ],
  },
  {
    name: "Green tea",
    brand: null,
    sizes: [
      { sizeLabel: "8 oz", caffeineMg: 28 },
      { sizeLabel: "12 oz", caffeineMg: 42 },
    ],
  },
  {
    name: "Energy drink",
    brand: "Red Bull",
    sizes: [
      { sizeLabel: "8.4 oz can", caffeineMg: 80 },
      { sizeLabel: "12 oz can", caffeineMg: 114 },
    ],
  },
  {
    name: "Energy drink",
    brand: "Monster",
    sizes: [
      { sizeLabel: "16 oz", caffeineMg: 160 },
    ],
  },
];

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
