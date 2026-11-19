import { BPBD_ROLES, SPM_ROLES } from '@etangguh/shared';
import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LandingPage } from '../features/landing/LandingPage';
import { ExportsPage } from '../features/spm/exports/ExportsPage';
import { RecapPage } from '../features/spm/recap/RecapPage';
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
