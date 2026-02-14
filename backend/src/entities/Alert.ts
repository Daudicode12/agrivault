import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { StorageUnit } from "./StorageUnit";

@Entity("alerts")
export class Alert {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 50 })
  type: string; // high_temp | high_humidity | rapid_change | price_alert | spoilage_warning

  @Column({ length: 20 })
  severity: string; // low | medium | high | critical

  @Column({ type: "text" })
  message: string;

  @Column({ type: "jsonb", nullable: true })
  data: Record<string, any>; // Additional context (trigger value, threshold, etc.)

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isSent: boolean; // Whether push/SMS notification was sent

  @Column({ length: 20, default: "push" })
  channel: string; // push | sms | in_app | email

  @ManyToOne(() => User, (u) => u.alerts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => StorageUnit, (su) => su.alerts, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "storageUnitId" })
  storageUnit: StorageUnit;

  @Column({ nullable: true })
  storageUnitId: string;

  @CreateDateColumn()
  createdAt: Date;
}
