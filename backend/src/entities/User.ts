import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { StorageUnit } from "./StorageUnit";
import { Alert } from "./Alert";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  fullName: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column()
  password: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ default: "farmer" })
  role: string; // farmer | admin | researcher

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => StorageUnit, (unit) => unit.owner)
  storageUnits: StorageUnit[];

  @OneToMany(() => Alert, (alert) => alert.user)
  alerts: Alert[];
}
