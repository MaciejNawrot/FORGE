import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TrainingController } from './training.controller.js';
import { TrainingRepository } from './training.repository.js';
import { TrainingService } from './training.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TrainingController],
  providers: [TrainingService, TrainingRepository],
})
export class TrainingModule {}
