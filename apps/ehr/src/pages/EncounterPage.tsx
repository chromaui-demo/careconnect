import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Appointment, type Encounter, type LabOrder, type ErxOrder, type PaperworkProgress, type ScribeSession, type ExtendedChart } from '@careconnect/api-client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EncounterWorkspaceShell, Input, PageContainer, PageLoading, Progress, TabPanel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, Textarea, VitalSigns, useToast } from '@careconnect/design-system';

const SECTIONS = [
  { id: 'vitals', label: 'Vitals' }, { id: 'allergies', label: 'Allergies' },
  { id: 'medications', label: 'Medications' }, { id: 'hpi', label: 'HPI' },
  { id: 'ros', label: 'ROS' }, { id: 'exam', label: 'Exam' },
  { id: 'conditions', label: 'Conditions' }, { id: 'surgical', label: 'Surgical Hx' },
  { id: 'hospitalization', label: 'Hospitalization' }, { id: 'screening', label: 'Screening' },
  { id: 'procedures', label: 'Procedures' }, { id: 'immunizations', label: 'Immunizations' },
  { id: 'inhouse-meds', label: 'In-house MAR' }, { id: 'nursing', label: 'Nursing Orders' },
  { id: 'assessment', label: 'Assessment' }, { id: 'plan', label: 'Plan' },
  { id: 'paperwork', label: 'Paperwork' }, { id: 'labs', label: 'Labs' }, { id: 'erx', label: 'eRx' },
  { id: 'scribe', label: 'AI Scribe' },
];

const EXT_FIELDS: Array<{ key: keyof ExtendedChart; label: string }> = [
  { key: 'ros', label: 'Review of Systems' }, { key: 'exam', label: 'Physical Exam' },
  { key: 'conditions', label: 'Medical Conditions' }, { key: 'surgicalHistory', label: 'Surgical History' },
  { key: 'hospitalization', label: 'Hospitalization History' }, { key: 'screening', label: 'Screening' },
  { key: 'procedures', label: 'Procedures' }, { key: 'immunizations', label: 'Immunizations' },
  { key: 'inhouseMedications', label: 'In-house Medications' }, { key: 'nursingOrders', label: 'Nursing Orders' },
];

export function EncounterPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { push } = useToast();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [paperwork, setPaperwork] = useState<PaperworkProgress | null>(null);
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [erx, setErx] = useState<ErxOrder[]>([]);
  const [section, setSection] = useState('vitals');
  const [saving, setSaving] = useState(false);
  const [newLab, setNewLab] = useState('');
  const [newMed, setNewMed] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [scribe, setScribe] = useState<ScribeSession | null>(null);
  const [transcript, setTranscript] = useState('Patient reports sore throat and fever for 3 days. No difficulty breathing.');
  const [extended, setExtended] = useState<ExtendedChart>({});

  const loadClinical = async (encId: string) => {
    setLabs(await api.getLabOrders(encId));
    setErx(await api.getErxOrders(encId));
  };

  useEffect(() => {
    if (!appointmentId) return;
    api.getAppointment(appointmentId).then(setAppt);
    api.getPaperwork(appointmentId).then(setPaperwork).catch(() => {});
    api.getEncounterByAppointment(appointmentId).then((e) => {
      setEncounter(e);
      loadClinical(e.id);
      api.getExtendedChart(e.id).then(setExtended).catch(() => {});
    }).catch(() => {});
  }, [appointmentId]);

  const save = async (patch: Partial<Encounter>) => {
    if (!encounter) return;
    setSaving(true);
    try {
      setEncounter(await api.saveChartData(encounter.id, patch));
      push('Chart updated.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const sign = async () => {
    if (!encounter) return;
    await api.signEncounter(encounter.id);
    push('Documentation is complete.', 'success');
    navigate('/visits');
  };

  const orderLab = async () => {
    if (!encounter || !newLab.trim()) return;
    await api.createLabOrder(encounter.id, newLab.trim());
    setNewLab('');
    loadClinical(encounter.id);
  };

  const orderErx = async () => {
    if (!encounter || !newMed.trim()) return;
    await api.createErxOrder(encounter.id, { medication: newMed, dosage: newDosage || 'As directed' });
    setNewMed('');
    setNewDosage('');
    loadClinical(encounter.id);
  };

  const saveExtended = async (key: keyof ExtendedChart, value: string) => {
    if (!encounter) return;
    const next = { ...extended, [key]: value };
    setExtended(next);
    await api.saveExtendedChart(encounter.id, next);
  };

  if (!appt?.patient) return <PageContainer title="Encounter"><PageLoading label="Loading encounter…" /></PageContainer>;

  const patientAge = appt.patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(appt.patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0;

  const vitalReadings = encounter?.vitals
    ? Object.entries(encounter.vitals).map(([label, value]) => ({ label, value: String(value) }))
    : [];

  return (
    <PageContainer>
      <EncounterWorkspaceShell
        header={{
          title: `${appt.patient.firstName} ${appt.patient.lastName}`,
          subtitle: encounter?.chiefComplaint ?? appt.reasonForVisit,
          actions: <>
            {appt.serviceMode === 'virtual' && (
              <Button variant="secondary" onClick={() => navigate(`/telemed/${appointmentId}/waiting`)}>Join Telemed</Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/visits')}>Back</Button>
            <Button variant="accent" onClick={sign} disabled={encounter?.status === 'signed'}>Review & Sign</Button>
          </>,
        }}
        stats={paperwork ? [
          { label: 'Paperwork', value: `${paperwork.percent}%`, delta: paperwork.complete ? 'Complete' : 'In progress' },
          { label: 'Encounter', value: encounter?.status ?? 'open', delta: saving ? 'Saving…' : 'Chart' },
          { label: 'Labs ordered', value: String(labs.length), delta: 'This visit' },
          { label: 'eRx sent', value: String(erx.length), delta: 'This visit' },
        ] : undefined}
        patient={{
          name: `${appt.patient.firstName} ${appt.patient.lastName}`,
          mrn: appt.patient.id.slice(0, 8).toUpperCase(),
          dob: appt.patient.dateOfBirth,
          age: patientAge,
          sex: appt.patient.gender ?? 'Unknown',
          status: appt.status as 'in-office',
          alerts: encounter?.allergies?.length ? [`Allergies: ${encounter.allergies.join(', ')}`] : [],
        }}
      >
      {paperwork && !paperwork.complete && (
        <Progress value={paperwork.percent} label={`Paperwork ${paperwork.percent}% complete`} />
      )}

      <Tabs variant="pills" tabs={SECTIONS} activeTab={section} onChange={setSection} />

      <TabPanel active={section === 'vitals'}>
        <Card padding="lg"><CardHeader><CardTitle>Vitals</CardTitle></CardHeader>
          <CardContent>
            {vitalReadings.length > 0 ? (
              <VitalSigns readings={vitalReadings} />
            ) : (
              <p>No vitals recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel active={section === 'allergies'}>
        <Card padding="lg"><CardContent>
          <Input label="Allergies (comma-separated)" defaultValue={encounter?.allergies?.join(', ') ?? ''} fullWidth
            onBlur={(e) => save({ allergies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
        </CardContent></Card>
      </TabPanel>

      <TabPanel active={section === 'medications'}>
        <Card padding="lg"><CardContent>
          <Input label="Medications (comma-separated)" defaultValue={encounter?.medications?.join(', ') ?? ''} fullWidth
            onBlur={(e) => save({ medications: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
        </CardContent></Card>
      </TabPanel>

      <TabPanel active={section === 'hpi'}>
        <Card padding="lg"><CardContent>
          <Textarea label="HPI" defaultValue={encounter?.hpi ?? ''} fullWidth onBlur={(e) => save({ hpi: e.target.value })} />
        </CardContent></Card>
      </TabPanel>

      <TabPanel active={section === 'assessment'}>
        <Card padding="lg"><CardContent>
          <Input label="Assessment" defaultValue={encounter?.assessment ?? ''} fullWidth onBlur={(e) => save({ assessment: e.target.value })} />
        </CardContent></Card>
      </TabPanel>

      <TabPanel active={section === 'plan'}>
        <Card padding="lg"><CardContent>
          <Input label="Plan" defaultValue={encounter?.plan ?? ''} fullWidth onBlur={(e) => save({ plan: e.target.value })} />
        </CardContent></Card>
      </TabPanel>

      {EXT_FIELDS.map(({ key, label }) => {
        const tabId = key === 'surgicalHistory' ? 'surgical' : key === 'inhouseMedications' ? 'inhouse-meds' : key === 'nursingOrders' ? 'nursing' : key;
        return (
          <TabPanel key={key} active={section === tabId}>
            <Card padding="lg"><CardContent>
              <Textarea label={label} defaultValue={extended[key] ?? ''} fullWidth onBlur={(e) => saveExtended(key, e.target.value)} />
            </CardContent></Card>
          </TabPanel>
        );
      })}

      <TabPanel active={section === 'paperwork'}>
        <Card padding="lg">
          {paperwork ? (
            <Table>
              <TableHead><TableRow><TableHeader>Form</TableHeader><TableHeader>Status</TableHeader></TableRow></TableHead>
              <TableBody>
                {paperwork.steps.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.title}</TableCell>
                    <TableCell><Badge variant={s.completed ? 'completed' : 'warning'}>{s.completed ? 'Complete' : 'Pending'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p>No paperwork assigned.</p>}
        </Card>
      </TabPanel>

      <TabPanel active={section === 'labs'}>
        <Card padding="lg">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Input placeholder="Test name (e.g. CBC)" value={newLab} onChange={(e) => setNewLab(e.target.value)} />
            <Button variant="primary" onClick={orderLab}>Order Lab</Button>
          </div>
          <Table>
            <TableHead><TableRow><TableHeader>Test</TableHeader><TableHeader>Status</TableHeader><TableHeader>Results</TableHeader></TableRow></TableHead>
            <TableBody>
              {labs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.testName}</TableCell>
                  <TableCell>{l.status}</TableCell>
                  <TableCell>{l.results.map((r) => `${r.value} ${r.unit}`).join(', ') || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabPanel>

      <TabPanel active={section === 'erx'}>
        <Card padding="lg">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Input placeholder="Medication" value={newMed} onChange={(e) => setNewMed(e.target.value)} />
            <Input placeholder="Dosage" value={newDosage} onChange={(e) => setNewDosage(e.target.value)} />
            <Button variant="primary" onClick={orderErx}>Send eRx</Button>
          </div>
          <Table>
            <TableHead><TableRow><TableHeader>Medication</TableHeader><TableHeader>Dosage</TableHeader><TableHeader>Status</TableHeader></TableRow></TableHead>
            <TableBody>
              {erx.map((r) => (
                <TableRow key={r.id}><TableCell>{r.medication}</TableCell><TableCell>{r.dosage}</TableCell><TableCell>{r.status}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabPanel>

      <TabPanel active={section === 'scribe'}>
        <Card padding="lg">
          <CardContent>
            <p>AI ambient scribe — demo generates HPI/Assessment/Plan from transcript.</p>
            <Textarea label="Transcript" rows={4} value={transcript} onChange={(e) => setTranscript(e.target.value)} fullWidth />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={async () => {
                if (!encounter) return;
                const s = await api.startScribe(encounter.id);
                const processed = await api.submitScribeTranscript(s.id, transcript);
                setScribe(processed);
              }}>Generate Note</Button>
              {scribe && <Button variant="accent" onClick={async () => {
                await api.applyScribe(scribe.id);
                const e = await api.getEncounterByAppointment(appointmentId!);
                setEncounter(e);
              }}>Apply to Chart</Button>}
            </div>
            {scribe && (
              <div style={{ marginTop: 16, fontSize: 14 }}>
                <p><strong>HPI:</strong> {scribe.generatedHpi}</p>
                <p><strong>Assessment:</strong> {scribe.generatedAssessment}</p>
                <p><strong>Plan:</strong> {scribe.generatedPlan}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabPanel>
      </EncounterWorkspaceShell>
    </PageContainer>
  );
}
