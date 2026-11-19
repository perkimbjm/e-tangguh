import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ADMIN_ROLES,
  createUserSchema,
  updateUserSchema,
  type CreateUserRequest,
  type SessionUser,
  type UpdateUserRequest,
} from '@etangguh/shared';
import { CurrentUser, Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Audit } from '../audit/audit.decorator';
import { UsersService } from './users.service';

@Controller('admin/users')
@Roles(...ADMIN_ROLES)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list() {
    return { items: await this.users.list() };
  }

  @Post()
  @Audit('user.create', 'users')
  create(@CurrentUser() actor: SessionUser, @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserRequest) {
    return this.users.create(actor, body);
  }

  @Patch(':id')
  @Audit('user.update', 'users')
  update(
    @CurrentUser() actor: SessionUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserRequest,
  ) {
    return this.users.setActive(actor, id, body.isActive);
  }
}
