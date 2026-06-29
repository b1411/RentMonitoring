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
  CreateFloorSchema,
  UpdateFloorSchema,
  type CreateFloorInput,
  type UpdateFloorInput,
} from './floors.dto';
import { FloorsService } from './floors.service';

@Controller('floors')
export class FloorsController {
  constructor(private readonly floors: FloorsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateFloorSchema)) data: CreateFloorInput,
  ) {
    return this.floors.create(data);
  }

  @Get()
  findAll(@Query('buildingId') buildingId?: string) {
    return this.floors.findAll(buildingId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.floors.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFloorSchema)) data: UpdateFloorInput,
  ) {
    return this.floors.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.floors.remove(id);
  }
}
