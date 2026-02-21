const { EntitySchema } = require("typeorm");

const SensorReading = new EntitySchema({
  name: "SensorReading",
  tableName: "sensor_readings",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    temperature: {
      type: "decimal",
      precision: 5,
      scale: 2, // °C
    },
    humidity: {
      type: "decimal",
      precision: 5,
      scale: 2, // %
    },
    recordedAt: {
      type: "timestamp", // Timestamp from the device
    },
    deviceId: {
      type: "varchar",
      length: 100,
      nullable: true,
    },
    batteryLevel: {
      type: "decimal",
      precision: 5,
      scale: 2,
      nullable: true, // % remaining
    },
    signalStrength: {
      type: "int",
      nullable: true, // RSSI in dBm
    },
    storageUnitId: {
      type: "uuid",
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
  },
  indices: [
    {
      columns: ["storageUnitId", "recordedAt"], // Optimized for time-series queries
    },
  ],
  relations: {
    storageUnit: {
      type: "many-to-one",
      target: "StorageUnit",
      joinColumn: { name: "storageUnitId" },
      inverseSide: "sensorReadings",
      onDelete: "CASCADE",
    },
  },
});

module.exports = { SensorReading };
