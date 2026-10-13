import { AuthProvider } from './context/AuthContext';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PortalLayout } from './layout/PortalLayout';
import { LoginPage, ProtectedRoute } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { BookAppointmentPage } from './pages/BookAppointmentPage';
import { SelectTimePage } from './pages/SelectTimePage';
import { PatientInfoPage } from './pages/PatientInfoPage';
import { ReviewPage } from './pages/ReviewPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { MyVisitsPage } from './pages/MyVisitsPage';
import { VisitDetailPage } from './pages/VisitDetailPage';
import { PaperworkPage } from './pages/PaperworkPage';
import { TelemedWaitingPage, TelemedVideoPage } from './pages/TelemedPage';
import { ReschedulePage } from './pages/ReschedulePage';
import { WalkInPage } from './pages/WalkInPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { RefillRequestPage } from './pages/RefillRequestPage';
import { TestResultsPage } from './pages/TestResultsPage';
import { TestResultDetailPage } from './pages/TestResultDetailPage';
import { MessagesPage } from './pages/MessagesPage';
import { NewMessagePage } from './pages/NewMessagePage';
import { MessageThreadPage } from './pages/MessageThreadPage';
import { BillsPage } from './pages/BillsPage';
import {
  ServiceModePage, ServiceCategoryPage, ChoosePatientPage, GetReadyPage,
  MyPatientsPage, CancelVisitPage, CancelConfirmPage, StartVirtualVisitPage, AiInterviewPage,
} from './pages/IntakeFlowPages';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
            <Route index element={<HomePage />} />
            <Route path="book/service" element={<ServiceModePage />} />
            <Route path="book/service/in-person" element={<ServiceCategoryPage />} />
            <Route path="book/service/virtual" element={<ServiceCategoryPage />} />
            <Route path="book" element={<BookAppointmentPage />} />
            <Route path="book/choose-patient" element={<ChoosePatientPage />} />
            <Route path="book/time" element={<SelectTimePage />} />
            <Route path="book/info" element={<PatientInfoPage />} />
            <Route path="book/review" element={<ReviewPage />} />
            <Route path="book/confirmed" element={<ConfirmationPage />} />
            <Route path="book/get-ready" element={<GetReadyPage />} />
            <Route path="walk-in" element={<WalkInPage />} />
            <Route path="walk-in/:location" element={<WalkInPage />} />
            <Route path="my-patients" element={<MyPatientsPage />} />
            <Route path="medications" element={<MedicationsPage />} />
            <Route path="medications/refill" element={<RefillRequestPage />} />
            <Route path="results" element={<TestResultsPage />} />
            <Route path="results/:orderId" element={<TestResultDetailPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="messages/new" element={<NewMessagePage />} />
            <Route path="messages/:threadId" element={<MessageThreadPage />} />
            <Route path="bills" element={<BillsPage />} />
            <Route path="visits" element={<MyVisitsPage />} />
            <Route path="visits/:id" element={<VisitDetailPage />} />
            <Route path="visits/:id/get-ready" element={<GetReadyPage />} />
            <Route path="visits/:id/paperwork" element={<PaperworkPage />} />
            <Route path="visits/:id/paperwork/:questionnaireId" element={<PaperworkPage />} />
            <Route path="visits/:id/paperwork/review" element={<ReviewPage />} />
            <Route path="visits/:id/telemed" element={<StartVirtualVisitPage />} />
            <Route path="visits/:id/telemed/waiting" element={<TelemedWaitingPage />} />
            <Route path="visits/:id/telemed/video" element={<TelemedVideoPage />} />
            <Route path="visits/:id/reschedule" element={<ReschedulePage />} />
            <Route path="visits/:id/cancel" element={<CancelVisitPage />} />
            <Route path="visits/:id/cancel/confirm" element={<CancelConfirmPage />} />
            <Route path="visits/:id/ai-interview" element={<AiInterviewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
