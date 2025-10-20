import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Mode } from '../../mode/entities/mode.entity';

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  mode_id: string;

  @ManyToOne(() => Mode)
  @JoinColumn({ name: 'mode_id' })
  mode: Mode;
}