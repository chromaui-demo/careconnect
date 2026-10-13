import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppointmentStatus } from '@careconnect/types';
import { api, type Appointment } from '@careconnect/api-client';
import {
  Badge,
  Button,
  type DataGridColumn,
  PageContainer,
  PageLoading,
  Select,
  Tooltip,
  TrackingBoardView,
  type AppointmentRowData,
  appointmentStatusBadge,
  formatStatusLabel,
  useToast,
} from '@careconnect/design-system';
import { AddPatientDialog, useFilterOptions } from '../components/Dialogs';

const STATUS_TABS: Array<{ id: AppointmentStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'prebooked', label: 'Prebooked' },
  { id: 'in-office', label: 'In Office' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function toRowData(appt: Appointment): AppointmentRowData {
  return {
    id: appt.id,
    patientName: `${appt.patient?.firstName ?? ''} ${appt.patient?.lastName ?? ''}`.trim() || 'Unknown',
    time: formatTime(appt.scheduledTime),
    reason: appt.reasonForVisit,
    provider: appt.provider,
    location: appt.location,
    status: appt.status as AppointmentRowData['status'],
  };
}

export function TrackingBoardPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<string>('in-office');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('all');
  const [provider, setProvider] = useState('all');
  const [serviceCategory, setServiceCategory] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const { locations, providers, services } = useFilterOptions();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments({
        location: location !== 'all' ? location : undefined,
        provider: provider !== 'all' ? provider : undefined,
      });
      setAppointments(data);
    } finally {
      setLoading(false);
    }
  }, [location, provider]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => appointments.filter((a) => {
    if (activeTab !== 'all' && a.status !== activeTab) return false;
    if (search) {
      const name = `${a.patient?.firstName} ${a.patient?.lastName}`.toLowerCase();
      if (!name.includes(search.toLowerCase())) return false;
    }
    if (serviceCategory !== 'all' && a.visitType !== serviceCategory) return false;
    const day = a.scheduledTime.slice(0, 10);
    if (dateRange.from && day < dateRange.from) return false;
    if (dateRange.to && day > dateRange.to) return false;
    return true;
  }), [appointments, activeTab, search, serviceCategory, dateRange]);

  const rowData = useMemo(() => filtered.map(toRowData), [filtered]);

  const tabCounts = STATUS_TABS.reduce((acc, t) => {
    acc[t.id] = t.id === 'all'
      ? appointments.length
      : appointments.filter((a) => a.status === t.id).length;
    return acc;
  }, {} as Record<string, number>);

  const handleCheckIn = async (id: string) => {
    await api.updateAppointmentStatus(id, 'in-office');
    push('Patient moved to in-office queue.', 'success');
    load();
  };

  const openAppointment = (id: string) => navigate(`/visit/${id}`);

  const gridColumns: DataGridColumn<AppointmentRowData>[] = [
    { id: 'patient', header: 'Patient', accessor: (r) => r.patientName, sortValue: (r) => r.patientName },
    { id: 'time', header: 'Scheduled', accessor: (r) => r.time, sortValue: (r) => r.time },
    { id: 'reason', header: 'Reason', accessor: (r) => r.reason },
    { id: 'provider', header: 'Provider', accessor: (r) => r.provider },
    { id: 'location', header: 'Location', accessor: (r) => r.location },
    {
      id: 'status',
      header: 'Status',
      accessor: (r) => (
        <Tooltip content={formatStatusLabel(r.status)}>
          <Badge variant={appointmentStatusBadge(r.status)} dot>{formatStatusLabel(r.status)}</Badge>
        </Tooltip>
      ),
      sortValue: (r) => r.status,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (r) => {
        const appt = filtered.find((a) => a.id === r.id);
        if (!appt) return null;
        if (appt.status === 'in-office') {
          return appt.serviceMode === 'virtual'
            ? <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); navigate(`/telemed/${appt.id}/waiting`); }}>Join Telemed</Button>
            : <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); navigate(`/encounter/${appt.id}`); }}>Start Encounter</Button>;
        }
        if (appt.status === 'prebooked') {
          return <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); handleCheckIn(appt.id); }}>Check In</Button>;
        }
        return null;
      },
    },
  ];

  const queueCards = useMemo(() => [
    {
      title: 'Waiting now',
      appointments: rowData.filter((r) => r.status === 'in-office').slice(0, 4).map((r, i) => ({ ...r, isNext: i === 0 })),
    },
    {
      title: 'Prebooked today',
      appointments: rowData.filter((r) => r.status === 'prebooked').slice(0, 4),
    },
  ], [rowData]);

  const locationOptions = locations.map((l) => ({ value: l.value, label: l.label }));

  return (
    <PageContainer title="Tracking Board" actions={
      <>
        <Select label="" options={providers} value={provider} onChange={(e) => setProvider(e.target.value)} />
        <Select label="" options={services} value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} />
        <Button variant="secondary" onClick={() => navigate('/visits/add')}>Add Visit</Button>
        <Button variant="primary" onClick={() => setShowAddPatient(true)}>Add Patient</Button>
      </>
    }>
      {loading ? (
        <PageLoading label="Loading appointments…" />
      ) : (
        <TrackingBoardView
          filters={{
            dateRange,
            onDateRangeChange: setDateRange,
            location: location === 'all' ? locationOptions[0]?.value ?? 'all' : location,
            onLocationChange: setLocation,
            search,
            onSearchChange: setSearch,
            activeTab,
            onTabChange: setActiveTab,
            onApply: load,
            statusTabs: STATUS_TABS.map((t) => ({ ...t, count: tabCounts[t.id] })),
            locationOptions: [{ value: 'all', label: 'All locations' }, ...locationOptions],
          }}
          queueCards={queueCards}
          gridColumns={gridColumns}
          gridRows={rowData}
          onOpen={openAppointment}
          gridSearchFilter={(r, q) => r.patientName.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q)}
        />
      )}
      <AddPatientDialog open={showAddPatient} onClose={() => setShowAddPatient(false)} onCreated={(id) => navigate(`/patient/${id}`)} />
    </PageContainer>
  );
}
