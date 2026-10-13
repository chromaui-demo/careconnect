import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Employee, type Location, type Schedule, type ServiceCategory, type InsurancePayer, type Questionnaire } from '@careconnect/api-client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, PageContainer, RadioGroup, Sidebar, Switch, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs } from '@careconnect/design-system';
import { AddEmployeeDialog } from '../components/Dialogs';

const SECTIONS = [
  { id: 'employees', label: 'Employees' },
  { id: 'locations', label: 'Locations' },
  { id: 'services', label: 'Services' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'questionnaires', label: 'Questionnaires' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AdminPage() {
  const { section: routeSection } = useParams();
  const [section, setSection] = useState(routeSection ?? 'employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [payers, setPayers] = useState<InsurancePayer[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  useEffect(() => {
    api.admin.getEmployees().then(setEmployees);
    api.admin.getLocations().then(setLocations);
    api.admin.getServices().then(setServices);
    api.admin.getSchedules().then(setSchedules);
    api.admin.getInsurancePayers().then(setPayers);
    api.admin.getQuestionnaires().then(setQuestionnaires);
  }, []);

  useEffect(() => { if (routeSection) setSection(routeSection); }, [routeSection]);

  return (
    <PageContainer title="Administration">
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        <Sidebar
          items={SECTIONS.map((s) => ({ id: s.id, label: s.label, active: section === s.id }))}
          onItemSelect={setSection}
          footer="CareConnect admin"
        />
        <div className="cc-stack">
      <Tabs tabs={SECTIONS} activeTab={section} onChange={setSection} />

      {section === 'employees' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Employees & Providers</CardTitle><Button size="sm" variant="primary" onClick={() => setShowAddEmployee(true)}>Add Employee</Button></CardHeader>
          <Table>
            <TableHead><TableRow><TableHeader>Name</TableHeader><TableHeader>Email</TableHeader><TableHeader>Role</TableHeader><TableHeader>Status</TableHeader></TableRow></TableHead>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.firstName} {e.lastName}</TableCell>
                  <TableCell>{e.email}</TableCell>
                  <TableCell><Badge>{e.role}</Badge></TableCell>
                  <TableCell>{e.active ? 'Active' : 'Inactive'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {section === 'locations' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Locations</CardTitle></CardHeader>
          <Table>
            <TableHead><TableRow><TableHeader>Name</TableHeader><TableHeader>Address</TableHeader><TableHeader>Phone</TableHeader></TableRow></TableHead>
            <TableBody>
              {locations.map((l) => (
                <TableRow key={l.id}><TableCell>{l.name}</TableCell><TableCell>{l.address}</TableCell><TableCell>{l.phone}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {section === 'services' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Service Categories</CardTitle></CardHeader>
          <Table>
            <TableHead><TableRow><TableHeader>Service</TableHeader><TableHeader>Mode</TableHeader><TableHeader>Description</TableHeader></TableRow></TableHead>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell><Badge variant="info">{s.mode}</Badge></TableCell><TableCell>{s.description}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {section === 'schedules' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Provider Schedules</CardTitle></CardHeader>
          <Table>
            <TableHead><TableRow><TableHeader>Provider</TableHeader><TableHeader>Location</TableHeader><TableHeader>Day</TableHeader><TableHeader>Hours</TableHeader></TableRow></TableHead>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.practitioner_name}</TableCell>
                  <TableCell>{s.location_name}</TableCell>
                  <TableCell>{DAYS[s.day_of_week]}</TableCell>
                  <TableCell>{s.start_time} – {s.end_time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {section === 'insurance' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Insurance Payers</CardTitle></CardHeader>
          <Table>
            <TableHead><TableRow><TableHeader>Payer</TableHeader><TableHeader>Payer ID</TableHeader></TableRow></TableHead>
            <TableBody>
              {payers.map((p) => (<TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{p.payer_id}</TableCell></TableRow>))}
            </TableBody>
          </Table>
        </Card>
      )}

      {section === 'questionnaires' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Intake Questionnaires</CardTitle></CardHeader>
          <Table>
            <TableHead><TableRow><TableHeader>Title</TableHeader><TableHeader>Slug</TableHeader><TableHeader></TableHeader></TableRow></TableHead>
            <TableBody>
              {questionnaires.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>{q.title}</TableCell>
                  <TableCell>{q.slug}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => api.admin.deleteQuestionnaire(q.id).then(() => api.admin.getQuestionnaires().then(setQuestionnaires))}>Deactivate</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <QuestionnaireBuilder onCreated={() => api.admin.getQuestionnaires().then(setQuestionnaires)} />
        </Card>
      )}
      <AddEmployeeDialog open={showAddEmployee} onClose={() => setShowAddEmployee(false)} onCreated={() => api.admin.getEmployees().then(setEmployees)} />
        </div>
      </div>
    </PageContainer>
  );
}

function QuestionnaireBuilder({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [required, setRequired] = useState(true);
  const [fieldType, setFieldType] = useState('text');
  const [multiPage, setMultiPage] = useState(false);

  const create = async () => {
    if (!title || !slug) return;
    await api.admin.createQuestionnaire({
      title, slug,
      schema: { pages: [{ slug: 'page-1', title, fields: [{ id: slug.replace(/-/g, '_'), type: fieldType, label: fieldLabel || title, required }] }] },
    });
    setTitle(''); setSlug(''); setFieldLabel('');
    onCreated();
  };

  return (
    <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--cc-border)' }}>
      <h4>Create Questionnaire</h4>
      <div className="portal-form cc-stack" style={{ maxWidth: 480 }}>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
        <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} fullWidth />
        <Input label="First field label" value={fieldLabel} onChange={(e) => setFieldLabel(e.target.value)} fullWidth />
        <RadioGroup
          label="Field type"
          name="field-type"
          value={fieldType}
          onChange={(e) => setFieldType(e.target.value)}
          options={[
            { value: 'text', label: 'Short text' },
            { value: 'textarea', label: 'Long text' },
            { value: 'select', label: 'Dropdown' },
          ]}
        />
        <Checkbox label="Field is required" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        <Switch label="Multi-page questionnaire" checked={multiPage} onChange={(e) => setMultiPage(e.target.checked)} />
        <Button variant="primary" onClick={create}>Add Questionnaire</Button>
      </div>
    </div>
  );
}
