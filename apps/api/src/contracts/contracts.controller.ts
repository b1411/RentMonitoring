import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CreateContractSchema,
  UpdateContractSchema,
  type CreateContractInput,
  type UpdateContractInput,
} from './contracts.dto';
import { ContractsService } from './contracts.service';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateContractSchema))
    data: CreateContractInput,
  ) {
    return this.contracts.create(data);
  }

  @Get()
  findAll(
    @Query('roomId') roomId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.contracts.findAll(roomId, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contracts.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateContractSchema))
    data: UpdateContractInput,
  ) {
    return this.contracts.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contracts.remove(id);
  }
}
