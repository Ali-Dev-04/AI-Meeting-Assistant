import { Test } from '@nestjs/testing';
import { Workspace } from '@prisma/client';
import { QuotaExceededError } from '../../common/errors';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { UsageService } from './usage.service';

describe('UsageService', () => {
  let service: UsageService;
  const upsert = jest.fn();

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UsageService, { provide: PrismaService, useValue: { usageRecord: { upsert } } }],
    }).compile();
    service = moduleRef.get(UsageService);
    upsert.mockReset();
  });

  const workspace = (plan: Workspace['plan']) => ({ id: 'ws-1', plan }) as Workspace;

  it('allows an upload when under the plan limit', async () => {
    upsert.mockResolvedValue({ meetingCount: 2 });
    await expect(service.assertCanUpload(workspace('FREE'))).resolves.toBeUndefined();
  });

  it('blocks an upload when the FREE limit (5) is reached', async () => {
    upsert.mockResolvedValue({ meetingCount: 5 });
    await expect(service.assertCanUpload(workspace('FREE'))).rejects.toBeInstanceOf(
      QuotaExceededError,
    );
  });

  it('never limits unlimited plans (no DB check)', async () => {
    await expect(service.assertCanUpload(workspace('BUSINESS'))).resolves.toBeUndefined();
    expect(upsert).not.toHaveBeenCalled();
  });
});
