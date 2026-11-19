import { Controller, Get, Query } from '@nestjs/common';
import { ROLES } from '@etangguh/shared';
import { z } from 'zod';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RegionsRepository } from './regions.repository';

const listQuery = z.object({
  level: z.enum(['kecamatan', 'kelurahan']).optional(),
  parent: z.string().uuid().optional(),
});

@Controller('regions')
export class RegionsController {
  constructor(private readonly regions: RegionsRepository) {}

  @Roles(...ROLES)
  @Get()
  list(@Query(new ZodValidationPipe(listQuery)) q: z.infer<typeof listQuery>) {
    return this.regions.list(q.level, q.parent).then((items) => ({ items }));
  }
}
