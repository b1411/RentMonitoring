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
import { Roles } from '../auth/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CreateRoomSchema,
  UpdateDoorSchema,
  UpdateRoomSchema,
  UpdateRoomStatusSchema,
  type CreateRoomInput,
  type UpdateDoorInput,
  type UpdateRoomInput,
  type UpdateRoomStatusInput,
} from './rooms.dto';
import { RoomsService } from './rooms.service';

// Reads expose finances → any authenticated role. Markup writes → ADMIN.
@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Roles('ADMIN')
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

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoomSchema)) data: UpdateRoomInput,
  ) {
    return this.rooms.update(id, data);
  }

  @Roles('ADMIN', 'MANAGER')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoomStatusSchema))
    data: UpdateRoomStatusInput,
  ) {
    return this.rooms.updateStatus(id, data);
  }

  @Roles('ADMIN')
  @Patch(':id/door')
  setDoor(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDoorSchema)) data: UpdateDoorInput,
  ) {
    return this.rooms.setDoor(id, data.door);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rooms.remove(id);
  }
}
