import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Unique identifier for the setting' })
  id: string;

  @Column({ type: 'int' })
  @ApiProperty({ description: 'Number of trial days' })
  trial_day: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  @ApiProperty({ description: 'Number of trial minutes' })
  trial_minutes: number;

  @Column({ type: 'varchar', length: 50, default: 'gpt-4o' })
  @ApiProperty({ description: 'Default OpenAI model', example: 'gpt-4o' })
  model: string;

  @Column({ type: 'int', default: 2000 })
  @ApiProperty({
    description: 'Default max tokens for OpenAI requests',
    example: 2000,
  })
  max_tokens: number;

  @CreateDateColumn()
  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: Date;
}
