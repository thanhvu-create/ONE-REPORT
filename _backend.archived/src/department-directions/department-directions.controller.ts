import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { DepartmentDirectionsService } from './department-directions.service';
import { UpsertDirectionDto } from './dto/upsert-direction.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@Controller('department-directions')
export class DepartmentDirectionsController {
  constructor(private readonly service: DepartmentDirectionsService) {}

  /** List the current direction for departments the user can see. */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listForUser(user);
  }

  /** Current direction for a specific department. */
  @Get(':departmentId')
  getCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId', ParseIntPipe) departmentId: number,
  ) {
    return this.service.getCurrentForDepartment(user, departmentId);
  }

  /** Recent history of a department's direction (up to 20). */
  @Get(':departmentId/history')
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId', ParseIntPipe) departmentId: number,
  ) {
    return this.service.history(user, departmentId);
  }

  /** Manager/admin updates the current direction. */
  @Put(':departmentId')
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId', ParseIntPipe) departmentId: number,
    @Body() dto: UpsertDirectionDto,
  ) {
    return this.service.upsertCurrent(user, departmentId, dto);
  }
}
