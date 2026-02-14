import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { StorageUnit } from "./StorageUnit";

@Entity("sensor_readings")
@Index(["storageUnitId", "recordedAt"]) // Optimized for time-series queries
export class SensorReading {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  temperature: number; // °C

  @Column({ type: "decimal", precision: 5, scale: 2 })
  humidity: number; // %

  @Column({ type: "timestamp" })
  recordedAt: Date; // Timestamp from the device

  @Column({ length: 100, nullable: true })
  deviceId: string;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  batteryLevel: number; // % remaining

  @Column({ type: "int", nullable: true })
  signalStrength: number; // RSSI in dBm

  @ManyToOne(() => StorageUnit, (su) => su.sensorReadings, { onDelete: "CASCADE" })
  @JoinColumn({ name: "storageUnitId" })
  storageUnit: StorageUnit;

  @Column()
  storageUnitId: string;

  @CreateDateColumn()
  createdAt: Date;
}
