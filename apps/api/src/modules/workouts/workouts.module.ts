import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WorkoutsController } from './workouts.controller.js';
import { WorkoutsRepository } from './workouts.repository.js';
import { WorkoutsService } from './workouts.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService, WorkoutsRepository],
})
export class WorkoutsModule {}
