import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  CreateInvoiceSchema,
  UpdateInvoiceStatusSchema,
  type CreateInvoiceInput,
  type UpdateInvoiceStatusInput,
} from './invoices.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateInvoiceSchema)) data: CreateInvoiceInput,
  ) {
    return this.invoices.create(data);
  }

  @Get()
  findAll(
    @Query('contractId') contractId?: string,
    @Query('status') status?: string,
  ) {
    return this.invoices.findAll(contractId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoices.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInvoiceStatusSchema))
    data: UpdateInvoiceStatusInput,
  ) {
    return this.invoices.updateStatus(id, data);
  }
}
