import { BadRequestException, Controller, Param, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JobsService } from './jobs.service';

/** Manual triggers for the cron workers — handy for QA without waiting for the schedule. */
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Roles('ADMIN')
  @Post('run/:task')
  run(@Param('task') task: string) {
    switch (task) {
      case 'expired-bookings':
        return this.jobs.handleExpiredBookings();
      case 'monthly-invoices':
        return this.jobs.generateMonthlyInvoices();
      case 'overdue-invoices':
        return this.jobs.checkOverdueInvoices();
      default:
        throw new BadRequestException(
          `Unknown task "${task}". Use: expired-bookings | monthly-invoices | overdue-invoices`,
        );
    }
  }
}
