import { z } from 'zod';

export const InvoiceStatusSchema = z.enum(['UNPAID', 'PAID', 'CANCELLED']);

export const CreateInvoiceSchema = z.object({
  contractId: z.uuid(),
  amount: z.coerce.number().nonnegative(),
  dueDate: z.coerce.date(),
  status: InvoiceStatusSchema.optional(),
});

export const UpdateInvoiceStatusSchema = z.object({
  status: InvoiceStatusSchema,
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<
  typeof UpdateInvoiceStatusSchema
>;
