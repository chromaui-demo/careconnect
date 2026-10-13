import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, type ServiceCategory } from '@careconnect/api-client';
import { Button, Card, CardContent, Alert, Checkbox, Divider, Progress, RadioGroup, Textarea } from '@careconnect/design-system';
import { PortalPage } from '../components/PortalPage';

export function ServiceModePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('in-person');

  return (
    <PortalPage title="Choose how you'd like to be seen" subtitle="Step 1 of 4">
      <Progress value={25} label="Booking progress" showValue />
      <RadioGroup
        name="service-mode"
        label="Visit mode"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        options={[
          { value: 'in-person', label: 'In person', description: 'Visit a clinic location' },
          { value: 'virtual', label: 'Virtual', description: 'Video visit from home' },
        ]}
      />
      <Divider />
      <div className="portal-actions">
        <Button variant="primary" onClick={() => navigate(mode === 'virtual' ? '/book/service/virtual' : '/book/service/in-person')}>Continue</Button>
      </div>
    </PortalPage>
  );
}

export function ServiceCategoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = location.pathname.includes('virtual') ? 'virtual' : 'in-person';
  const [services, setServices] = useState<ServiceCategory[]>([]);

  useEffect(() => {
    api.admin.getServices().then((rows) => setServices(rows.filter((s) => s.mode === mode || s.mode === 'both')));
  }, [mode]);

  return (
    <>
      <h1>Select service</h1>
      <div className="portal-cards">
        {services.map((s) => (
          <button key={s.id} type="button" className="portal-card-option" onClick={() => navigate(`/book?mode=${mode}&service=${encodeURIComponent(s.name)}`)}>
            <h3>{s.name}</h3><p>{s.description}</p>
          </button>
        ))}
      </div>
      <Button variant="ghost" onClick={() => navigate('/book/service')}>Back</Button>
    </>
  );
}

export function ChoosePatientPage() {
  const navigate = useNavigate();
  const { appointmentId } = useParams();

  return (
    <Card padding="lg">
      <CardContent>
        <h2>Who is this visit for?</h2>
        <div className="portal-cards">
          <button type="button" className="portal-card-option" onClick={() => navigate(appointmentId ? `/visits/${appointmentId}/get-ready` : '/book/info?self=1')}>
            <h3>Myself</h3>
          </button>
          <button type="button" className="portal-card-option" onClick={() => navigate('/book/info?new=1')}>
            <h3>Someone else</h3>
          </button>
          <button type="button" className="portal-card-option" onClick={() => navigate('/my-patients')}>
            <h3>Choose from my patients</h3>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export function GetReadyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <Card padding="lg">
      <CardContent>
        <h2>Get ready for your visit</h2>
        <ul>
          <li>Have your ID and insurance card ready</li>
          <li>Complete intake paperwork before check-in</li>
          <li>For virtual visits, test your camera and microphone</li>
        </ul>
        <Button variant="primary" onClick={() => navigate(id ? `/visits/${id}/paperwork` : '/visits')}>Continue</Button>
      </CardContent>
    </Card>
  );
}

export function MyPatientsPage() {
  const navigate = useNavigate();
  return (
    <Card padding="lg">
      <CardContent>
        <h2>My Patients</h2>
        <p>Family members linked to your portal account appear here (demo: use My Visits for history).</p>
        <Button onClick={() => navigate('/visits')}>View visit history</Button>
        <Button variant="ghost" onClick={() => navigate('/')}>Home</Button>
      </CardContent>
    </Card>
  );
}

export function CancelVisitPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState(false);
  return (
    <PortalPage title="Cancel visit">
      <Alert variant="warning">Cancellation fees may apply for same-day visits.</Alert>
      <Textarea label="Reason for cancellation" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} fullWidth />
      <Checkbox label="I understand this cannot be undone" checked={ack} onChange={(e) => setAck(e.target.checked)} />
      <Button variant="primary" disabled={!ack} onClick={() => navigate(`/visits/${id}/cancel/confirm?reason=${encodeURIComponent(reason)}`)}>Continue</Button>
    </PortalPage>
  );
}

export function CancelConfirmPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get('reason') ?? '';

  const confirm = async () => {
    if (id) {
      await api.cancelAppointment(id);
    }
    navigate('/visits');
  };

  return (
    <Card padding="lg">
      <CardContent>
        <h2>Confirm cancellation</h2>
        <p>Reason: {reason || 'Not provided'}</p>
        <Button variant="primary" onClick={confirm}>Confirm cancel</Button>
        <Button variant="ghost" onClick={() => navigate(`/visits/${id}`)}>Keep visit</Button>
      </CardContent>
    </Card>
  );
}

export function StartVirtualVisitPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <Card padding="lg">
      <CardContent>
        <h2>Start virtual visit</h2>
        <p>When you&apos;re ready, join the waiting room. Your provider will admit you shortly.</p>
        <Button variant="accent" onClick={() => navigate(`/visits/${id}/telemed/waiting`)}>Join waiting room</Button>
      </CardContent>
    </Card>
  );
}

export function AiInterviewPage() {
  const [notes, setNotes] = useState('');
  return (
    <PortalPage title="Pre-visit interview" subtitle="AI-assisted symptom collection (demo)">
      <Textarea label="Describe your symptoms" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
      <Button variant="primary" onClick={() => window.history.back()}>Save & continue</Button>
    </PortalPage>
  );
}
