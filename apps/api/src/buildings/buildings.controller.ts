import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
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

  @Roles('ADMIN')
  @Post()
  create(
    @Body(new ZodValidationPipe(CreateBuildingSchema))
    data: CreateBuildingInput,
  ) {
    return this.buildings.create(data);
  }

  @Public()
  @Get()
  findAll() {
    return this.buildings.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.buildings.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBuildingSchema))
    data: UpdateBuildingInput,
  ) {
    return this.buildings.update(id, data);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.buildings.remove(id);
  }
}
