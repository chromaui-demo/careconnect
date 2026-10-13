import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Patient } from '@careconnect/api-client';
import {
  Button,
  DatePicker,
  EmptyState,
  Input,
  PageContainer,
  Pagination,
  PatientAvatar,
  SkeletonCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from '@careconnect/design-system';
import { AddPatientDialog } from '../components/Dialogs';

const PAGE_SIZE = 10;

export function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [dobFilter, setDobFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getPatients(search || undefined).then((rows) => {
      setPatients(rows);
      setLoading(false);
    }).catch(console.error);
  }, [search]);

  const filtered = patients.filter((p) => !dobFilter || p.dateOfBirth === dobFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <PageContainer title="Patients" actions={<Button variant="primary" onClick={() => setShowAdd(true)}>Add Patient</Button>}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 400 }} />
        <DatePicker label="DOB filter" value={dobFilter} onChange={(e) => { setDobFilter(e.target.value); setPage(1); }} />
      </div>
      {loading ? (
        <div className="cc-grid-auto cc-grid-auto--2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No patients found" description="Try adjusting search or add a new patient." action={<Button onClick={() => setShowAdd(true)}>Add Patient</Button>} />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Patient</TableHeader>
                <TableHeader>DOB</TableHeader>
                <TableHeader>Phone</TableHeader>
                <TableHeader>Email</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((p) => (
                <TableRow key={p.id} clickable onClick={() => navigate(`/patient/${p.id}`)}>
                  <TableCell>
                    <Tooltip content={`MRN ${p.id.slice(0, 8).toUpperCase()}`}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <PatientAvatar patient={p} size="sm" />
                        <strong>{p.firstName} {p.lastName}</strong>
                      </div>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{p.dateOfBirth}</TableCell>
                  <TableCell>{p.phone}</TableCell>
                  <TableCell>{p.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
      <AddPatientDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={(id) => navigate(`/patient/${id}`)} />
    </PageContainer>
  );
}
