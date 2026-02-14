import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { StorageUnit } from "./StorageUnit";

@Entity("prediction_logs")
export class PredictionLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 50 })
  type: string; // spoilage | market_forecast | recommendation

  @Column({ length: 20 })
  riskLevel: string; // low | medium | high | critical

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  confidenceScore: number; // 0.00 to 1.00

  @Column({ type: "int", nullable: true })
  estimatedDaysToSpoilage: number;

  @Column({ length: 50, nullable: true })
  recommendation: string; // sell_now | hold | sell_soon | wait

  @Column({ type: "text", nullable: true })
  reasoning: string;

  @Column({ type: "jsonb", nullable: true })
  inputData: Record<string, any>; // Snapshot of data used for prediction

  @ManyToOne(() => StorageUnit, (su) => su.predictionLogs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "storageUnitId" })
  storageUnit: StorageUnit;

  @Column()
  storageUnitId: string;

  @CreateDateColumn()
  createdAt: Date;
}
