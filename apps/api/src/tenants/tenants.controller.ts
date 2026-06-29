import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  type CreateTenantInput,
  type UpdateTenantInput,
} from './tenants.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateTenantSchema)) data: CreateTenantInput,
  ) {
    return this.tenants.create(data);
  }

  @Get()
  findAll() {
    return this.tenants.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenants.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTenantSchema)) data: UpdateTenantInput,
  ) {
    return this.tenants.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenants.remove(id);
  }
}
