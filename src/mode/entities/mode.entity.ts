import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
