import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { CreatePositionKpiDto } from './dto/create-position-kpi.dto';
import { UpdatePositionKpiDto } from './dto/update-position-kpi.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@Controller('positions')
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('departmentId', new ParseIntPipe({ optional: true })) departmentId?: number,
  ) {
    return this.service.list(user, departmentId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findById(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePositionDto,
  ) {
    return this.service.create(user, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(user, id);
  }

  // --- KPI sub-resource ---

  @Post(':id/kpis')
  addKpi(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) positionId: number,
    @Body() dto: CreatePositionKpiDto,
  ) {
    return this.service.addKpi(user, positionId, dto);
  }

  @Put(':id/kpis/:kpiId')
  updateKpi(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) positionId: number,
    @Param('kpiId', ParseIntPipe) kpiId: number,
    @Body() dto: UpdatePositionKpiDto,
  ) {
    return this.service.updateKpi(user, positionId, kpiId, dto);
  }

  @Delete(':id/kpis/:kpiId')
  removeKpi(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) positionId: number,
    @Param('kpiId', ParseIntPipe) kpiId: number,
  ) {
    return this.service.removeKpi(user, positionId, kpiId);
  }
}
