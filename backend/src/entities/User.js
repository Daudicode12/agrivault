const { EntitySchema } = require("typeorm");

const User = new EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
    },
    fullName: {
      type: "varchar",
      length: 100,
    },
    email: {
      type: "varchar",
      length: 255,
      unique: true,
    },
    password: {
      type: "varchar",
    },
    phone: {
      type: "varchar",
      length: 20,
      nullable: true,
    },
    location: {
      type: "varchar",
      length: 255,
      nullable: true,
    },
    role: {
      type: "varchar",
      default: "farmer", // farmer | admin | researcher
    },
    isActive: {
      type: "boolean",
      default: true,
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
      inverseSide: "owner",
    },
    alerts: {
      type: "one-to-many",
      target: "Alert",
      inverseSide: "user",
    },
  },
});

module.exports = { User };
