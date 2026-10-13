import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PageLoading } from '@careconnect/design-system';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './layout/AppLayout';
import { BillingSectionLayout } from './layout/BillingSectionLayout';
import { LoginPage, ProtectedRoute } from './pages/LoginPage';
import { TrackingBoardPage } from './pages/TrackingBoardPage';
import { PatientsPage } from './pages/PatientsPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { PatientChartInfoPage } from './pages/PatientChartInfoPage';
import { PatientDocsPage } from './pages/PatientDocsPage';
import { PatientActionLogsPage } from './pages/PatientActionLogsPage';
import { EncounterPage } from './pages/EncounterPage';
import { AdminPage } from './pages/AdminPage';
import { TasksPage } from './pages/TasksPage';
import { FaxPage } from './pages/FaxPage';
import { FaxMatchPage } from './pages/FaxMatchPage';
import { LabsInboxPage } from './pages/LabsInboxPage';
import { ExternalLabsPage, InhouseLabsPage, RadiologyPage } from './pages/ExternalLabsPage';
import { TelemedProviderPage, TelemedWaitingPage } from './pages/TelemedProviderPage';
import { VisitDetailPage } from './pages/VisitDetailPage';
import { AddVisitPage } from './pages/AddVisitPage';
import { RequireRole } from './components/RequireRole';
import { BILLING_WRITE_ROLES } from './pages/billing/permissions';
import { ClaimsPage } from './pages/billing/ClaimsPage';
import { ClaimDetailPage } from './pages/billing/ClaimDetailPage';
import { CreateClaimPage } from './pages/billing/CreateClaimPage';
import { EraPage, EraDetailPage, EraClaimDetailPage } from './pages/billing/EraPage';
import { BillingPatientsPage } from './pages/billing/BillingPatientsPage';
import { BillingPatientDetailPage } from './pages/billing/BillingPatientDetailPage';
import { MasterDataPage, ChargeMastersPage, TagsPage, RulesPage } from './pages/billing/MasterDataPage';

const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const PatientArPage = lazy(() => import('./pages/billing/PatientArPage').then((m) => ({ default: m.PatientArPage })));

function RouteFallback() {
  return <PageLoading label="Loading page…" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/visits" replace />} />
            <Route path="visits" element={<TrackingBoardPage />} />
            <Route path="visits/add" element={<AddVisitPage />} />
            <Route path="visit/:id" element={<VisitDetailPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patient/:id" element={<PatientDetailPage />} />
            <Route path="patient/:id/info" element={<PatientChartInfoPage />} />
            <Route path="patient/:id/docs" element={<PatientDocsPage />} />
            <Route path="patient/:id/action-logs" element={<PatientActionLogsPage />} />
            <Route path="encounter/:appointmentId" element={<EncounterPage />} />
            <Route path="telemed/:appointmentId/waiting" element={<TelemedWaitingPage />} />
            <Route path="telemed/:appointmentId/video" element={<TelemedProviderPage />} />
            <Route path="telemed/:appointmentId" element={<TelemedWaitingPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/:section" element={<AdminPage />} />
            <Route path="billing" element={<BillingSectionLayout />}>
              <Route index element={<Navigate to="claims" replace />} />
              <Route path="claims" element={<ClaimsPage />} />
              <Route path="claims/new" element={<RequireRole roles={BILLING_WRITE_ROLES}><CreateClaimPage /></RequireRole>} />
              <Route path="claims/:id" element={<ClaimDetailPage />} />
              <Route path="eras" element={<EraPage />} />
              <Route path="eras/:id" element={<EraDetailPage />} />
              <Route path="eras/:eraId/claims/:claimId" element={<EraClaimDetailPage />} />
              <Route path="patient-ar" element={<Suspense fallback={<RouteFallback />}><PatientArPage /></Suspense>} />
              <Route path="patients" element={<BillingPatientsPage />} />
              <Route path="patients/:id" element={<BillingPatientDetailPage />} />
              <Route path="billing-providers" element={<MasterDataPage />} />
              <Route path="rendering-providers" element={<MasterDataPage />} />
              <Route path="service-facilities" element={<MasterDataPage />} />
              <Route path="charge-masters" element={<ChargeMastersPage />} />
              <Route path="tags" element={<TagsPage />} />
              <Route path="rules/:engine" element={<RulesPage />} />
              <Route path="*" element={<Navigate to="claims" replace />} />
            </Route>
            <Route path="tasks" element={<TasksPage />} />
            <Route path="fax" element={<FaxPage />} />
            <Route path="fax/inbound/:id/match" element={<FaxMatchPage />} />
            <Route path="labs-inbox" element={<LabsInboxPage />} />
            <Route path="labs/external" element={<ExternalLabsPage />} />
            <Route path="labs/inhouse" element={<InhouseLabsPage />} />
            <Route path="radiology" element={<RadiologyPage />} />
            <Route path="reports" element={<Suspense fallback={<RouteFallback />}><ReportsPage /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
