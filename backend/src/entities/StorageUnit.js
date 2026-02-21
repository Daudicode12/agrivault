const { EntitySchema } = require("typeorm");

const StorageUnit = new EntitySchema({
  name: "StorageUnit",
  tableName: "storage_units",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    name: {
      type: "varchar",
      length: 150, // e.g., "Barn A - Maize Storage"
    },
    location: {
      type: "varchar",
      length: 255,
      nullable: true, // GPS coordinates or description
    },
    capacityKg: {
      type: "decimal",
      precision: 10,
      scale: 2,
      nullable: true,
    },
    currentStockKg: {
      type: "decimal",
      precision: 10,
      scale: 2,
      nullable: true,
    },
    status: {
      type: "varchar",
      default: "active", // active | inactive | maintenance
    },
    deviceId: {
      type: "varchar",
      length: 100,
      nullable: true, // ESP32 device identifier
    },
    deviceApiKey: {
      type: "varchar",
      length: 100,
      nullable: true, // API key for device authentication
    },
    ownerId: {
      type: "uuid",
    },
    commodityId: {
      type: "uuid",
      nullable: true,
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
    owner: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "ownerId" },
      inverseSide: "storageUnits",
      onDelete: "CASCADE",
    },
    commodity: {
      type: "many-to-one",
      target: "Commodity",
      joinColumn: { name: "commodityId" },
      inverseSide: "storageUnits",
      nullable: true,
    },
    sensorReadings: {
      type: "one-to-many",
      target: "SensorReading",
      inverseSide: "storageUnit",
    },
    alerts: {
      type: "one-to-many",
      target: "Alert",
      inverseSide: "storageUnit",
    },
    predictionLogs: {
      type: "one-to-many",
      target: "PredictionLog",
      inverseSide: "storageUnit",
    },
  },
});

module.exports = { StorageUnit };
