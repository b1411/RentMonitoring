import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CreateFloorSchema,
  UpdateFloorSchema,
  type CreateFloorInput,
  type UpdateFloorInput,
} from './floors.dto';
import { FloorsService } from './floors.service';
import { planMulterOptions } from './plan-upload';

@Controller('floors')
export class FloorsController {
  constructor(private readonly floors: FloorsService) {}

  @Roles('ADMIN')
  @Post()
  create(
    @Body(new ZodValidationPipe(CreateFloorSchema)) data: CreateFloorInput,
  ) {
    return this.floors.create(data);
  }

  @Public()
  @Get()
  findAll(@Query('buildingId') buildingId?: string) {
    return this.floors.findAll(buildingId);
  }

  /** Public map. Guests get occupancy only; authed users also get tenant + rent. */
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser | null) {
    return this.floors.findOne(id, { includeSensitive: Boolean(user) });
  }

  /** Upload (or replace) the floor's plan image. Returns the updated floor. */
  @Roles('ADMIN')
  @Post(':id/plan')
  @UseInterceptors(FileInterceptor('file', planMulterOptions))
  uploadPlan(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('Файл не передан');
    const base = `${req.protocol}://${req.get('host')}`;
    return this.floors.setPlan(id, `${base}/uploads/${file.filename}`);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFloorSchema)) data: UpdateFloorInput,
  ) {
    return this.floors.update(id, data);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.floors.remove(id);
  }
}
