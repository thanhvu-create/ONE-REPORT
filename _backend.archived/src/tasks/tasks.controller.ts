import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query';
import { ParseSheetDto } from './dto/parse-sheet.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTasksQuery,
  ) {
    return this.service.list(user, query);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getStats(user);
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
    @Body() dto: CreateTaskDto,
  ) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
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

  @Post('parse-sheet')
  parseSheet(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ParseSheetDto,
  ) {
    return this.service.parseFromSheet(user, dto);
  }

  @Post('bulk-create')
  bulkCreate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { tasks: any[] },
  ) {
    return this.service.bulkCreateFromPreviews(user, body.tasks ?? []);
  }
}
