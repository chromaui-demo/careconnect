import { useEffect, useState } from 'react';
import { api, type ClinicalOrder } from '@careconnect/api-client';
import { Button, Input, PageContainer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@careconnect/design-system';

function LabsModulePage({ title, loadFn, createFn }: {
  title: string;
  loadFn: (encId: string) => Promise<ClinicalOrder[]>;
  createFn: (encId: string, data: { testName?: string; studyName?: string; labName?: string; modality?: string }) => Promise<{ id: string }>;
}) {
  const [encounterId, setEncounterId] = useState('');
  const [testName, setTestName] = useState('');
  const [orders, setOrders] = useState<ClinicalOrder[]>([]);

  const load = () => { if (encounterId) loadFn(encounterId).then(setOrders); };

  useEffect(() => { load(); }, [encounterId]);

  return (
    <PageContainer title={title}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input placeholder="Encounter ID" value={encounterId} onChange={(e) => setEncounterId(e.target.value)} />
        <Input placeholder="Test / study name" value={testName} onChange={(e) => setTestName(e.target.value)} />
        <Button variant="primary" onClick={async () => {
          if (!encounterId || !testName) return;
          await createFn(encounterId, { testName, studyName: testName });
          setTestName('');
          load();
        }}>Order</Button>
      </div>
      <Table>
        <TableHead><TableRow><TableHeader>Name</TableHeader><TableHeader>Status</TableHeader><TableHeader>Ordered</TableHeader></TableRow></TableHead>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}><TableCell>{o.testName ?? o.studyName}</TableCell><TableCell>{o.status}</TableCell><TableCell>{o.orderedAt}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </PageContainer>
  );
}

export function ExternalLabsPage() {
  return <LabsModulePage title="External Labs" loadFn={api.getExternalLabs} createFn={(id, d) => api.createExternalLab(id, { testName: d.testName ?? '', labName: d.labName })} />;
}

export function InhouseLabsPage() {
  return <LabsModulePage title="In-house Labs" loadFn={api.getInhouseLabs} createFn={(id, d) => api.createInhouseLab(id, { testName: d.testName ?? '' })} />;
}

export function RadiologyPage() {
  return <LabsModulePage title="Radiology Orders" loadFn={api.getRadiologyOrders} createFn={(id, d) => api.createRadiologyOrder(id, { studyName: d.studyName ?? d.testName ?? '', modality: d.modality })} />;
}
