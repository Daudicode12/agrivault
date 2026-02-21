const { EntitySchema } = require("typeorm");

const Commodity = new EntitySchema({
  name: "Commodity",
  tableName: "commodities",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    name: {
      type: "varchar",
      length: 100,
      unique: true, // e.g., Maize, Wheat, Rice, Beans
    },
    category: {
      type: "varchar",
      length: 50,
      nullable: true, // e.g., Grain, Legume, Tuber
    },
    optimalTempMin: {
      type: "decimal",
      precision: 5,
      scale: 2,
      nullable: true, // °C
    },
    optimalTempMax: {
      type: "decimal",
      precision: 5,
      scale: 2,
      nullable: true,
    },
    optimalHumidityMin: {
      type: "decimal",
      precision: 5,
      scale: 2,
      nullable: true, // %
    },
    optimalHumidityMax: {
      type: "decimal",
      precision: 5,
      scale: 2,
      nullable: true,
    },
    maxStorageDays: {
      type: "int",
      nullable: true, // Typical max storage duration
    },
    unit: {
      type: "varchar",
      length: 50,
      nullable: true, // kg, bag (90kg), ton
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
    updatedAt: {
      type: "timestamp",
      updateDate: true,
    },
  },
  relations: {
    storageUnits: {
      type: "one-to-many",
      target: "StorageUnit",
      inverseSide: "commodity",
    },
    marketData: {
      type: "one-to-many",
      target: "MarketData",
      inverseSide: "commodity",
    },
  },
});

module.exports = { Commodity };
