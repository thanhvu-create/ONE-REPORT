import { Module } from '@nestjs/common';
import { DepartmentDirectionsController } from './department-directions.controller';
import { DepartmentDirectionsService } from './department-directions.service';

@Module({
  controllers: [DepartmentDirectionsController],
  providers: [DepartmentDirectionsService],
  exports: [DepartmentDirectionsService],
})
export class DepartmentDirectionsModule {}
