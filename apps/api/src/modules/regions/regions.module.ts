import { Global, Module } from '@nestjs/common';
import { RegionsController } from './regions.controller';
import { RegionsRepository } from './regions.repository';

@Global()
@Module({ controllers: [RegionsController], providers: [RegionsRepository], exports: [RegionsRepository] })
export class RegionsModule {}
