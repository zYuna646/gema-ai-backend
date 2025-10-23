import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum RoleType {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('modes')
export class Mode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  context: string;

  @Column({ type: 'float', default: 0.7 })
  temperature: number;

  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.SYSTEM,
  })
  role: RoleType;
}
