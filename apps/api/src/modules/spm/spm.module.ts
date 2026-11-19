import { Module } from '@nestjs/common';
import { HazardZonesController } from './hazard-zones/hazard-zones.controller';
import { HazardZonesRepository } from './hazard-zones/hazard-zones.repository';
import { HazardZonesService } from './hazard-zones/hazard-zones.service';
import { HazardImportValidator } from './imports/hazard-import.validator';
import { ImportApply } from './imports/import-apply';
import { ImportCleanup } from './imports/import-cleanup';
import { ImportLookup } from './imports/import-lookup';
import { ImportValidator } from './imports/import-validator';
import { ImportsController } from './imports/imports.controller';
import { ImportsRepository } from './imports/imports.repository';
import { ImportsService } from './imports/imports.service';
import { TemplateBuilder } from './imports/template-builder';
import { ApprovalController } from './residents/approval.controller';
import { ApprovalService } from './residents/approval.service';
import { CompletenessController, CompletenessService } from './residents/completeness.service';
import { CorrectionsController } from './residents/corrections.controller';
import { ResidentsController } from './residents/residents.controller';
import { ResidentsMapper } from './residents/residents.mapper';
import { ResidentsRepository } from './residents/residents.repository';
import { ResidentsService } from './residents/residents.service';

/** Modul SPM sub-urusan bencana (Form 5.A). Tahun anggaran berada di FiscalYearsModule (global). */
@Module({
  controllers: [
    HazardZonesController,
    // ApprovalController didaftarkan sebelum ResidentsController agar /approve tidak tertangkap /:id.
    ApprovalController,
    ResidentsController,
    CompletenessController,
    CorrectionsController,
    ImportsController,
  ],
  providers: [
    HazardZonesRepository,
    HazardZonesService,
    ResidentsRepository,
    ResidentsMapper,
    ResidentsService,
    ApprovalService,
    CompletenessService,
    ImportsRepository,
    ImportLookup,
    ImportValidator,
    HazardImportValidator,
    ImportApply,
    ImportCleanup,
    ImportsService,
    TemplateBuilder,
  ],
  exports: [HazardZonesService, ResidentsRepository],
})
export class SpmModule {}
