import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Mode } from '../../mode/entities/mode.entity';
import { User } from '../../users/entities/user.entity';
export enum SoundType {
  ALLOY = 'alloy',
  VERSE = 'verse',
  CORAL = 'coral',
  SAGE = 'sage',
  AMBER = 'amber',
  ONYX = 'onyx',
}

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

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: SoundType,
    default: SoundType.ALLOY,
  })
  sound: SoundType;
}
