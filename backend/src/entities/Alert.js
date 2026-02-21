const { EntitySchema } = require("typeorm");

const Alert = new EntitySchema({
  name: "Alert",
  tableName: "alerts",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    type: {
      type: "varchar",
      length: 50, // high_temp | high_humidity | rapid_change | price_alert | spoilage_warning
    },
    severity: {
      type: "varchar",
      length: 20, // low | medium | high | critical
    },
    message: {
      type: "text",
    },
    data: {
      type: "jsonb",
      nullable: true, // Additional context (trigger value, threshold, etc.)
    },
    isRead: {
      type: "boolean",
      default: false,
    },
    isSent: {
      type: "boolean",
      default: false, // Whether push/SMS notification was sent
    },
    channel: {
      type: "varchar",
      length: 20,
      default: "push", // push | sms | in_app | email
    },
    userId: {
      type: "uuid",
    },
    storageUnitId: {
      type: "uuid",
      nullable: true,
    },
    createdAt: {
      type: "timestamp",
      createDate: true,
    },
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "userId" },
      inverseSide: "alerts",
      onDelete: "CASCADE",
    },
    storageUnit: {
      type: "many-to-one",
      target: "StorageUnit",
      joinColumn: { name: "storageUnitId" },
      inverseSide: "alerts",
      nullable: true,
      onDelete: "SET NULL",
    },
  },
});

module.exports = { Alert };
