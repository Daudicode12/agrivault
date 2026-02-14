import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { StorageUnit } from "./StorageUnit";
import { MarketData } from "./MarketData";

@Entity("commodities")
export class Commodity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 100 })
  name: string; // e.g., Maize, Wheat, Rice, Beans

  @Column({ length: 50, nullable: true })
  category: string; // e.g., Grain, Legume, Tuber

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  optimalTempMin: number; // °C

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  optimalTempMax: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  optimalHumidityMin: number; // %

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  optimalHumidityMax: number;

  @Column({ type: "int", nullable: true })
  maxStorageDays: number; // Typical max storage duration

  @Column({ length: 50, nullable: true })
  unit: string; // kg, bag (90kg), ton

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => StorageUnit, (su) => su.commodity)
  storageUnits: StorageUnit[];

  @OneToMany(() => MarketData, (md) => md.commodity)
  marketData: MarketData[];
}
