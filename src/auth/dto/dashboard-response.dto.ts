import { ApiProperty } from '@nestjs/swagger';

export class DashboardResponseDto {
  @ApiProperty({
    description: 'Informasi user',
    example: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    },
  })
  user: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Informasi trial summary',
    example: {
      data: {
        hasTrials: true,
        latestTrial: {
          id: '1',
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-12-31T23:59:59Z',
          minutes: 60,
        },
        isActive: true,
        remainingDays: 30,
        remainingMinutes: 60,
      },
      meta: {
        message: 'Summary trial untuk user berhasil ditemukan',
        status: true,
      },
    },
  })
  trialSummary: any;

  @ApiProperty({
    description: 'Informasi quota summary',
    example: {
      data: {
        user_id: '1',
        totalQuota: 120,
        usedQuota: 60,
        remainingQuota: 60,
      },
      meta: {
        options: {
          message: 'Summary quota untuk user berhasil dihitung',
          code: 200,
          status: true,
        },
      },
    },
  })
  quotaSummary: any;
}
