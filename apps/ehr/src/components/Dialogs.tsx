import { useEffect, useState } from 'react';
import { api, type Patient, type Employee } from '@careconnect/api-client';
import { Button, Input, Modal, PasswordInput, Select } from '@careconnect/design-system';

export function AddPatientDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const submit = async () => {
    if (!firstName || !lastName || !dob) return;
    const { id } = await api.createPatient({ firstName, lastName, dateOfBirth: dob, gender: 'unknown', phone, email });
    onCreated(id);
    onClose();
    setFirstName(''); setLastName(''); setDob('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Patient">
      <div className="portal-form">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
        <Input label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} fullWidth />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
        <Button variant="primary" onClick={submit}>Create Patient</Button>
      </div>
    </Modal>
  );
}

export function AddTaskDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');

  useEffect(() => { if (open) api.getPatients().then(setPatients); }, [open]);

  const submit = async () => {
    if (!title) return;
    await api.createTask({ title, description, priority, patientId: patientId || undefined });
    onCreated();
    onClose();
    setTitle(''); setDescription('');
  };

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <div className="portal-form">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
        <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} options={[
          { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' },
        ]} />
        <Select label="Patient (optional)" value={patientId} onChange={(e) => setPatientId(e.target.value)} options={[
          { value: '', label: 'None' }, ...patients.map((p) => ({ value: p.id, label: `${p.firstName} ${p.lastName}` })),
        ]} />
        <Button variant="primary" onClick={submit}>Create Task</Button>
      </div>
    </Modal>
  );
}

export function AddEmployeeDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Staff');
  const [password, setPassword] = useState('');
  const passwordTooShort = password.length > 0 && password.length < 12;

  const submit = async () => {
    if (!email || !firstName || password.length < 12) return;
    await api.admin.createEmployee({ email, firstName, lastName, role, password });
    onCreated();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Employee">
      <div className="portal-form">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
        <PasswordInput
          label="Initial password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 12 characters. Share it with the employee securely."
          error={passwordTooShort ? 'Use at least 12 characters.' : undefined}
          autoComplete="new-password"
        />
        <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)} options={[
          { value: 'Staff', label: 'Staff' }, { value: 'Provider', label: 'Provider' }, { value: 'Administrator', label: 'Administrator' },
        ]} />
        <Button variant="primary" onClick={submit}>Add Employee</Button>
      </div>
    </Modal>
  );
}

export function PatientPickerDialog({ open, onClose, onSelect, title = 'Select Patient' }: {
  open: boolean; onClose: () => void; onSelect: (patient: Patient) => void; title?: string;
}) {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    if (!open) return;
    // Ignore responses for a search the user has already typed past.
    let current = true;
    api.getPatients(search || undefined).then((rows) => { if (current) setPatients(rows); });
    return () => { current = false; };
  }, [open, search]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
      <div style={{ maxHeight: 320, overflow: 'auto', marginTop: 12 }}>
        {patients.map((p) => (
          <Button key={p.id} variant="ghost" style={{ justifyContent: 'flex-start', width: '100%' }} onClick={() => { onSelect(p); onClose(); }}>
            {p.firstName} {p.lastName} — {p.dateOfBirth}
          </Button>
        ))}
      </div>
    </Modal>
  );
}

export function useFilterOptions() {
  const [locations, setLocations] = useState<Array<{ value: string; label: string }>>([{ value: 'all', label: 'All Locations' }]);
  const [providers, setProviders] = useState<Array<{ value: string; label: string }>>([{ value: 'all', label: 'All Providers' }]);
  const [services, setServices] = useState<Array<{ value: string; label: string }>>([{ value: 'all', label: 'All Services' }]);

  useEffect(() => {
    api.admin.getLocations().then((rows) => setLocations([{ value: 'all', label: 'All Locations' }, ...rows.map((l) => ({ value: l.name, label: l.name }))]));
    api.admin.getEmployees().then((rows) => setProviders([
      { value: 'all', label: 'All Providers' },
      ...rows.filter((e: Employee) => e.role === 'Provider' || e.role === 'Administrator').map((e) => ({ value: `${e.firstName} ${e.lastName}`, label: `${e.firstName} ${e.lastName}` })),
    ]));
    api.admin.getServices().then((rows) => setServices([{ value: 'all', label: 'All Services' }, ...rows.map((s) => ({ value: s.name, label: s.name }))]));
  }, []);

  return { locations, providers, services };
}
