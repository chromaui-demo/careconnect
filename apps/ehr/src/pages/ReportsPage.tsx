import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  type Kpis,
  type ReportPayment,
} from '@careconnect/api-client';
import {
  AppointmentsBarChart,
  ClinicalRadarChart,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  MetricBarChart,
  PageContainer,
  PayerMixChart,
  PaymentsBarChart,
  RevenueTrendChart,
  Select,
  Skeleton,
  StatCard,
  StatusCountBarChart,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  UtilizationGaugeChart,
  VitalsTrendChart,
  WaitTimeAreaChart,
} from '@careconnect/design-system';

const REPORTS = [
  { id: 'incomplete', label: 'Incomplete Encounters' },
  { id: 'complete', label: 'Complete Encounters' },
  { id: 'recent', label: 'Recent Patients' },
  { id: 'payments', label: 'Daily Payments' },
  { id: 'visits', label: 'Visits Overview' },
  { id: 'kpis', label: 'Practice KPIs' },
  { id: 'invoiceable', label: 'Invoiceable Patients' },
  { id: 'ad-hoc', label: 'Ad-hoc Export' },
];

const chartGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
  gap: 16,
  marginBottom: 24,
};

function toStatusCounts(rows: Array<{ status: string; count: number }>) {
  return rows.map((r) => ({ name: r.status, count: Number(r.count) }));
}

function toPayerMix(rows: Array<{ status: string; count: number }>) {
  return rows.map((r) => ({ name: r.status, value: Number(r.count) }));
}

function aggregatePaymentsByPayer(payments: ReportPayment[]) {
  const totals = new Map<string, number>();
  for (const p of payments) {
    const key = p.payer || 'Unknown';
    totals.set(key, (totals.get(key) ?? 0) + Number(p.amount ?? 0));
  }
  return [...totals.entries()].map(([payer, amount]) => ({ payer, amount }));
}

function aggregatePaymentsByDay(payments: ReportPayment[]) {
  const totals = new Map<string, number>();
  for (const p of payments) {
    const day = p.date ? String(p.date).slice(0, 10) : 'Unknown';
    totals.set(day, (totals.get(day) ?? 0) + Number(p.amount ?? 0));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, charges]) => ({ month, charges, collections: charges }));
}

function practiceKpiMetrics(data: Record<string, number>) {
  return [
    { name: 'Patients', value: Number(data.totalPatients ?? 0) },
    { name: 'Signed', value: Number(data.signedEncounters ?? 0) },
    { name: 'Open Claims', value: Number(data.openClaims ?? 0) },
    { name: 'Unmatched ERAs', value: Number(data.unmatchedEras ?? 0) },
  ];
}

export function ReportsPage() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [visitsByStatus, setVisitsByStatus] = useState<Array<{ status: string; count: number }>>([]);
  const [payments, setPayments] = useState<ReportPayment[]>([]);
  const [section, setSection] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [adHocType, setAdHocType] = useState('claims');

  useEffect(() => {
    Promise.all([
      api.getKpis(),
      api.getVisitsOverviewReport(),
      api.getDailyPaymentsReport(),
    ]).then(([kpiData, visits, paymentRows]) => {
      setKpis(kpiData);
      setVisitsByStatus(visits.byStatus);
      setPayments(paymentRows);
    });
  }, []);

  const utilizationPct = useMemo(() => {
    if (!kpis?.totalAppointments) return 0;
    return Math.round((kpis.inOffice / kpis.totalAppointments) * 100);
  }, [kpis]);

  const todayAppointments = useMemo(() => {
    if (!kpis) return [];
    return [{
      day: 'Today',
      scheduled: kpis.appointmentsToday,
      completed: kpis.completedToday,
      noShow: Math.max(0, kpis.appointmentsToday - kpis.completedToday - kpis.inOffice),
    }];
  }, [kpis]);

  const load = async (name: string) => {
    setSection(name);
    if (name === 'incomplete') setRows(await api.getIncompleteEncounters() as unknown as Array<Record<string, unknown>>);
    if (name === 'complete') setRows(await api.getCompleteEncountersReport() as unknown as Array<Record<string, unknown>>);
    if (name === 'recent') setRows(await api.getRecentPatientsReport() as unknown as Array<Record<string, unknown>>);
    if (name === 'payments') setRows(await api.getDailyPaymentsReport() as unknown as Array<Record<string, unknown>>);
    if (name === 'visits') setRows((await api.getVisitsOverviewReport()).byStatus as unknown as Array<Record<string, unknown>>);
    if (name === 'kpis') setRows([await api.getPracticeKpisReport()]);
    if (name === 'invoiceable') setRows(await api.getInvoiceablePatientsReport() as unknown as Array<Record<string, unknown>>);
    if (name === 'ad-hoc') setRows(await api.runAdHocReport(adHocType) as Array<Record<string, unknown>>);
  };

  const metrics = kpis ? [
    { label: 'Appointments Today', value: String(kpis.appointmentsToday) },
    { label: 'In Office', value: String(kpis.inOffice) },
    { label: 'Open Tasks', value: String(kpis.openTasks) },
  ] : [];

  const invoiceableChartData = useMemo(() => {
    if (section !== 'invoiceable') return [];
    return rows
      .map((r) => ({ name: String(r.name ?? 'Unknown'), value: Number(r.amount ?? 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [rows, section]);

  const sectionCharts = () => {
    if (section === 'visits') {
      const statusRows = rows as Array<{ status: string; count: number }>;
      return (
        <div style={chartGridStyle}>
          <PayerMixChart
            data={toPayerMix(statusRows)}
            title="Visits by Status"
            subtitle="Appointment status distribution"
            height={260}
          />
          <StatusCountBarChart
            data={toStatusCounts(statusRows)}
            title="Visit Volume"
            subtitle="Count by appointment status"
            height={260}
          />
        </div>
      );
    }
    if (section === 'payments') {
      const paymentRows = rows as unknown as ReportPayment[];
      return (
        <div style={chartGridStyle}>
          <PaymentsBarChart
            data={aggregatePaymentsByPayer(paymentRows)}
            title="Submitted Claims by Payer"
            subtitle="Daily payments report"
            height={260}
          />
          <RevenueTrendChart
            data={aggregatePaymentsByDay(paymentRows)}
            title="Payment Trend"
            subtitle="Submitted amounts by day"
            height={260}
          />
        </div>
      );
    }
    if (section === 'kpis') {
      const kpiRow = (rows[0] ?? {}) as Record<string, number>;
      return (
        <div style={chartGridStyle}>
          <MetricBarChart
            data={practiceKpiMetrics(kpiRow)}
            title="Practice KPIs"
            subtitle="Patients, encounters, and RCM backlog"
            height={260}
          />
          <UtilizationGaugeChart
            value={utilizationPct}
            title="Clinic Utilization"
            subtitle="Patients currently in office"
            label="In-office rate"
            height={260}
          />
        </div>
      );
    }
    if (section === 'invoiceable' && invoiceableChartData.length > 0) {
      return (
        <MetricBarChart
          data={invoiceableChartData}
          title="Top Invoiceable Balances"
          subtitle="Submitted claim totals by patient"
          valueFormatter={(v) => `$${v.toLocaleString()}`}
          height={260}
        />
      );
    }
    return null;
  };

  return (
    <PageContainer title="Reports">
      {!kpis ? (
        <div className="cc-stack">
          <Skeleton height={24} width="40%" />
          <div className="cc-grid-auto cc-grid-auto--4">
            <Skeleton height={96} />
            <Skeleton height={96} />
            <Skeleton height={96} />
            <Skeleton height={96} />
          </div>
        </div>
      ) : (
      <>
      <div className="cc-grid-auto cc-grid-auto--4" style={{ marginBottom: 24 }}>
        {metrics.map((m) => (
          <StatCard key={m.label} label={m.label} value={m.value} sparkline />
        ))}
      </div>

      {kpis && (
        <div style={chartGridStyle}>
          <AppointmentsBarChart data={todayAppointments} height={240} />
          <VitalsTrendChart height={240} />
          <WaitTimeAreaChart height={240} />
          <ClinicalRadarChart height={240} />
          <PayerMixChart
            data={toPayerMix(visitsByStatus)}
            title="Appointment Status Mix"
            subtitle="All scheduled visits"
            height={240}
          />
          <UtilizationGaugeChart
            value={utilizationPct}
            title="Clinic Utilization"
            subtitle="In-office vs total appointments"
            label="In-office rate"
            height={240}
          />
          {payments.length > 0 && (
            <RevenueTrendChart
              data={aggregatePaymentsByDay(payments)}
              title="Recent Payment Trend"
              subtitle="Submitted claim amounts"
              height={240}
            />
          )}
        </div>
      )}

      <Card padding="lg">
        <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
        <CardContent style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REPORTS.map((r) => (
            <Button key={r.id} variant={section === r.id ? 'primary' : 'secondary'} onClick={() => load(r.id)}>{r.label}</Button>
          ))}
        </CardContent>
      </Card>

      {section === 'ad-hoc' && (
        <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
          <Select value={adHocType} onChange={(e) => setAdHocType(e.target.value)} options={[
            { value: 'claims', label: 'Claims CSV' }, { value: 'patients', label: 'Patients' },
          ]} />
          <Button onClick={() => load('ad-hoc')}>Run</Button>
        </div>
      )}

      {section && sectionCharts()}

      {section && (
        <Table>
          <TableHead>
            <TableRow>
              {Object.keys(rows[0] ?? { result: 'No data' }).map((k) => <TableHeader key={k}>{k}</TableHeader>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {Object.values(row).map((v, j) => <TableCell key={j}>{String(v)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {section === 'incomplete' && rows.length > 0 && (
        <Button style={{ marginTop: 12 }} onClick={() => navigate('/visits')}>Open tracking board</Button>
      )}
      </>
      )}
    </PageContainer>
  );
}
