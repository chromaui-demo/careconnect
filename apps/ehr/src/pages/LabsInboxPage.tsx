import { useEffect, useState } from 'react';
import { api, type UnsolicitedLab } from '@careconnect/api-client';
import { Button, EmptyState, LabTrendChart, PageContainer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@careconnect/design-system';
import { PatientPickerDialog } from '../components/Dialogs';

export function LabsInboxPage() {
  const { push } = useToast();
  const [items, setItems] = useState<UnsolicitedLab[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);

  const load = () => api.getUnsolicitedLabs().then(setItems);
  useEffect(() => { load(); }, []);

  const match = async (patientId: string) => {
    if (!matchId) return;
    await api.matchUnsolicitedLab(matchId, patientId);
    setMatchId(null);
    push('Lab result matched to patient.', 'success');
    load();
  };

  return (
    <PageContainer title="Unsolicited Lab Results">
      <div className="cc-grid-auto" style={{ marginBottom: 24 }}>
        <LabTrendChart height={220} />
      </div>
      {items.length === 0 ? (
        <EmptyState title="Inbox empty" description="Unmatched lab results from interfaces will appear here." />
      ) : (
        <Table>
          <TableHead><TableRow><TableHeader>Patient (reported)</TableHeader><TableHeader>Test</TableHeader><TableHeader>Result</TableHeader><TableHeader></TableHeader></TableRow></TableHead>
          <TableBody>
            {items.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.patientName}</TableCell>
                <TableCell>{l.testName}</TableCell>
                <TableCell>{l.resultValue} {l.resultUnit}</TableCell>
                <TableCell><Button size="sm" onClick={() => setMatchId(l.id)}>Match to Patient</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PatientPickerDialog open={!!matchId} onClose={() => setMatchId(null)} onSelect={(p) => match(p.id)} title="Match lab result to patient" />
    </PageContainer>
  );
}
