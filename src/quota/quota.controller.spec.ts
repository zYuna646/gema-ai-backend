import { Test, TestingModule } from '@nestjs/testing';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';

describe('QuotaController', () => {
  let controller: QuotaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotaController],
      providers: [QuotaService],
    }).compile();

    controller = module.get<QuotaController>(QuotaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
