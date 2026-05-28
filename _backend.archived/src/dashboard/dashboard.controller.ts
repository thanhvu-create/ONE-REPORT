import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles('leader', 'supervisor', 'executive', 'admin')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser, @Query('period') period?: string) {
    return this.dashboard.summary(user, period);
  }

  @Get('trend')
  trend(@CurrentUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.dashboard.trend(user, days);
  }

  @Get('priority-distribution')
  priorityDistribution(@CurrentUser() user: AuthenticatedUser, @Query('period') period?: string) {
    return this.dashboard.priorityDistribution(user, period);
  }

  @Get('issue-categories')
  issueCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboard.issueCategories(user, period, limit ? parseInt(limit, 10) : 8);
  }

  @Get('top-contributors')
  topContributors(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboard.topContributors(user, period, limit);
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.dashboard.recent(user, limit);
  }

  @Get('issues')
  issues(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.issues(user);
  }

  @Get('missing-reports')
  missingReports(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.missingReports(user);
  }

  @Get('dept-heatmap')
  deptHeatmap(@CurrentUser() user: AuthenticatedUser, @Query('period') period?: string) {
    return this.dashboard.deptHeatmap(user, period);
  }

  @Get('direction-adjustments')
  directionAdjustments(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.dashboard.directionAdjustments(user, limit);
  }
}
