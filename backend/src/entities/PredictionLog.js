const { EntitySchema } = require("typeorm");

const PredictionLog = new EntitySchema({
  name: "PredictionLog",
  tableName: "prediction_logs",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    type: {
      type: "varchar",
      length: 50, // spoilage | market_forecast | recommendation
    },
    riskLevel: {
      type: "varchar",
      length: 20, // low | medium | high | critical
    },
    confidenceScore: {
      type: "decimal",
      precision: 5,
      scale: 2,
      nullable: true, // 0.00 to 1.00
    },
    estimatedDaysToSpoilage: {
      type: "int",
      nullable: true,
    },
    recommendation: {
      type: "varchar",
      length: 50,
      nullable: true, // sell_now | hold | sell_soon | wait
    },
    reasoning: {
      type: "text",
      nullable: true,
    },
    inputData: {
      type: "jsonb",
      nullable: true, // Snapshot of data used for prediction
    },
    storageUnitId: {
      type: "uuid",
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
  },
  relations: {
    storageUnit: {
      type: "many-to-one",
      target: "StorageUnit",
      joinColumn: { name: "storageUnitId" },
      inverseSide: "predictionLogs",
      onDelete: "CASCADE",
    },
  },
});

module.exports = { PredictionLog };
