import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../../config/env';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { LocalFileStorage } from './local-storage';
import { FILE_STORAGE } from './storage.interface';

@Global()
@Module({
  controllers: [FilesController],
  providers: [FilesService, { provide: FILE_STORAGE, useFactory: () => new LocalFileStorage(loadEnv().FILE_STORAGE_DIR) }],
  exports: [FilesService],
})
export class FilesModule {}
