const { EntitySchema } = require("typeorm");

const MarketData = new EntitySchema({
  name: "MarketData",
  tableName: "market_data",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    price: {
      type: "decimal",
      precision: 12,
      scale: 2, // Price per unit (KES, USD, etc.)
    },
    currency: {
      type: "varchar",
      length: 10,
      default: "KES",
    },
    market: {
      type: "varchar",
      length: 255,
      nullable: true, // e.g., "Nairobi", "Mombasa", "Kisumu"
    },
    source: {
      type: "varchar",
      length: 100,
      nullable: true, // API name, manual, scraper
    },
    recordedAt: {
      type: "timestamp",
    },
    commodityId: {
      type: "uuid",
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
  },
  indices: [
    {
      columns: ["commodityId", "recordedAt"],
    },
  ],
  relations: {
    commodity: {
      type: "many-to-one",
      target: "Commodity",
      joinColumn: { name: "commodityId" },
      inverseSide: "marketData",
      onDelete: "CASCADE",
    },
  },
});

module.exports = { MarketData };
