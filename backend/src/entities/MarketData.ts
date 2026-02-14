import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Commodity } from "./Commodity";

@Entity("market_data")
@Index(["commodityId", "recordedAt"])
export class MarketData {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  price: number; // Price per unit (KES, USD, etc.)

  @Column({ length: 10, default: "KES" })
  currency: string;

  @Column({ length: 255, nullable: true })
  market: string; // e.g., "Nairobi", "Mombasa", "Kisumu"

  @Column({ length: 100, nullable: true })
  source: string; // API name, manual, scraper

  @Column({ type: "timestamp" })
  recordedAt: Date;

  @ManyToOne(() => Commodity, (c) => c.marketData, { onDelete: "CASCADE" })
  @JoinColumn({ name: "commodityId" })
  commodity: Commodity;

  @Column()
  commodityId: string;

  @CreateDateColumn()
  createdAt: Date;
}
