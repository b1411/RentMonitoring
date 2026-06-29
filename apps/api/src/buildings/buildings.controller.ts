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
  CreateBuildingSchema,
  UpdateBuildingSchema,
  type CreateBuildingInput,
  type UpdateBuildingInput,
} from './buildings.dto';
import { BuildingsService } from './buildings.service';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateBuildingSchema))
    data: CreateBuildingInput,
  ) {
    return this.buildings.create(data);
  }

  @Get()
  findAll() {
    return this.buildings.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.buildings.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBuildingSchema))
    data: UpdateBuildingInput,
  ) {
    return this.buildings.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.buildings.remove(id);
  }
}
