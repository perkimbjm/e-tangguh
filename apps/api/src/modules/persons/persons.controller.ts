import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ADMIN_ROLES, mergePersonSchema, type MergePersonRequest } from '@etangguh/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Audit } from '../audit/audit.decorator';
import { MergeService } from './merge.service';

@Controller('spm/persons')
export class PersonsController {
  constructor(private readonly merge: MergeService) {}

  @Roles(...ADMIN_ROLES)
  @Post(':id/merge')
  @HttpCode(200)
  @Audit('person.merge', 'persons')
  mergeInto(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(mergePersonSchema)) body: MergePersonRequest) {
    return this.merge.merge(id, body.targetPersonId);
  }
}
