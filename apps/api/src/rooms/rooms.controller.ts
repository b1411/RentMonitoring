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
  CreateRoomSchema,
  UpdateRoomSchema,
  UpdateRoomStatusSchema,
  type CreateRoomInput,
  type UpdateRoomInput,
  type UpdateRoomStatusInput,
} from './rooms.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(CreateRoomSchema)) data: CreateRoomInput) {
    return this.rooms.create(data);
  }

  @Get()
  findAll(@Query('floorId') floorId?: string) {
    return this.rooms.findAll(floorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rooms.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoomSchema)) data: UpdateRoomInput,
  ) {
    return this.rooms.update(id, data);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoomStatusSchema))
    data: UpdateRoomStatusInput,
  ) {
    return this.rooms.updateStatus(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rooms.remove(id);
  }
}
