import { SPM_ROLES } from '@etangguh/shared';
import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LandingPage } from '../features/landing/LandingPage';
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
    children: [{ index: true, element: <DashboardPage /> }],
  },
  { path: '*', element: <NotFoundPage /> },
]);
