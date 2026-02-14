import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Commodity } from "./Commodity";
import { SensorReading } from "./SensorReading";
import { Alert } from "./Alert";
import { PredictionLog } from "./PredictionLog";

@Entity("storage_units")
export class StorageUnit {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 150 })
  name: string; // e.g., "Barn A - Maize Storage"

  @Column({ length: 255, nullable: true })
  location: string; // GPS coordinates or description

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  capacityKg: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  currentStockKg: number;

  @Column({ default: "active" })
  status: string; // active | inactive | maintenance

  @Column({ length: 100, nullable: true })
  deviceId: string; // ESP32 device identifier

  @Column({ length: 100, nullable: true })
  deviceApiKey: string; // API key for device authentication

  @ManyToOne(() => User, (user) => user.storageUnits, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ownerId" })
  owner: User;

  @Column()
  ownerId: string;

  @ManyToOne(() => Commodity, (c) => c.storageUnits, { nullable: true })
  @JoinColumn({ name: "commodityId" })
  commodity: Commodity;

  @Column({ nullable: true })
  commodityId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SensorReading, (sr) => sr.storageUnit)
  sensorReadings: SensorReading[];

  @OneToMany(() => Alert, (a) => a.storageUnit)
  alerts: Alert[];

  @OneToMany(() => PredictionLog, (p) => p.storageUnit)
  predictionLogs: PredictionLog[];
}
