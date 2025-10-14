import { PartialType } from '@nestjs/swagger';
import { CreateTrialDto } from './create-trial.dto';

export class UpdateTrialDto extends PartialType(CreateTrialDto) {}
