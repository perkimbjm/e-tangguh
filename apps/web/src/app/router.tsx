import { BPBD_ROLES, SPM_ROLES } from '@etangguh/shared';
import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LandingPage } from '../features/landing/LandingPage';
import { ExportsPage } from '../features/spm/exports/ExportsPage';
import { RecapPage } from '../features/spm/recap/RecapPage';
import { EventDetailPage } from '../features/spm/events/EventDetailPage';
import { EventsPage } from '../features/spm/events/EventsPage';
import { InventoryPage } from '../features/spm/inventory/InventoryPage';
import { FiscalYearsPage } from '../features/spm/fiscal-years/FiscalYearsPage';
import { IdCardPage } from '../features/spm/id-card/IdCardPage';
import { VerifyPage } from '../features/spm/id-card/VerifyPage';
import { OfficerComparePage } from '../features/spm/officers/OfficerComparePage';
import { OfficerDetailPage } from '../features/spm/officers/OfficerDetailPage';
import { OfficersPage } from '../features/spm/officers/OfficersPage';
import { HazardZonesPage } from '../features/spm/hazard-zones/HazardZonesPage';
import { ImportPage } from '../features/spm/imports/ImportPage';
import { ApprovalQueuePage } from '../features/spm/residents/ApprovalQueuePage';
import { CompletenessPage } from '../features/spm/residents/CompletenessPage';
import { ResidentsPage } from '../features/spm/residents/ResidentsPage';
import { AppLayout } from './AppLayout';
import { NotFoundPage } from './NotFoundPage';
import { RequireRole } from './RequireRole';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/masuk', element: <LoginPage /> },
  { path: '/verifikasi/:code', element: <VerifyPage /> },
  {
    path: '/app',
    element: (
      <RequireRole roles={SPM_ROLES}>
        <AppLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'warga', element: <ResidentsPage /> },
      { path: 'impor', element: <ImportPage /> },
      { path: 'kelengkapan', element: <CompletenessPage /> },
      { path: 'kawasan-rawan', element: <HazardZonesPage /> },
      { path: 'rekap', element: <RecapPage /> },
      { path: 'ekspor', element: <ExportsPage /> },
      {
        path: 'petugas/bandingkan',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <OfficerComparePage />
          </RequireRole>
        ),
      },
      {
        path: 'petugas/:id/kartu',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <IdCardPage />
          </RequireRole>
        ),
      },
      {
        path: 'petugas/:id',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <OfficerDetailPage />
          </RequireRole>
        ),
      },
      {
        path: 'petugas',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <OfficersPage />
          </RequireRole>
        ),
      },
      {
        path: 'kejadian',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <EventsPage />
          </RequireRole>
        ),
      },
      {
        path: 'kejadian/:id',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <EventDetailPage />
          </RequireRole>
        ),
      },
      {
        path: 'peralatan',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <InventoryPage kind="equipment" />
          </RequireRole>
        ),
      },
      {
        path: 'logistik',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <InventoryPage kind="logistics" />
          </RequireRole>
        ),
      },
      {
        path: 'tahun-anggaran',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <FiscalYearsPage />
          </RequireRole>
        ),
      },
      {
        path: 'persetujuan',
        element: (
          <RequireRole roles={BPBD_ROLES}>
            <ApprovalQueuePage />
          </RequireRole>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
