import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type FaxInbound, type FaxMessage } from '@careconnect/api-client';
import { Button, Card, EmptyState, FileUpload, Input, PageContainer, TabPanel, Tabs, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@careconnect/design-system';

export function FaxPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [tab, setTab] = useState('inbound');
  const [inbound, setInbound] = useState<FaxInbound[]>([]);
  const [outbound, setOutbound] = useState<FaxMessage[]>([]);
  const [fax, setFax] = useState('');
  const [subject, setSubject] = useState('Medical records');

  const load = () => {
    api.getFaxInbound().then(setInbound);
    api.getFaxOutbound().then(setOutbound);
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    await api.sendFax({ recipientFax: fax, subject });
    setFax('');
    push('Outbound fax submitted.', 'success');
    load();
  };

  return (
    <PageContainer title="Fax">
      <Tabs tabs={[{ id: 'inbound', label: 'Inbound' }, { id: 'outbound', label: 'Outbound' }]} activeTab={tab} onChange={setTab} />
      <TabPanel active={tab === 'inbound'}>
        {inbound.length === 0 ? (
          <EmptyState title="No inbound faxes" description="Incoming documents will appear here." />
        ) : (
        <Table>
          <TableHead><TableRow><TableHeader>From</TableHeader><TableHeader>Pages</TableHeader><TableHeader>Status</TableHeader><TableHeader>Patient</TableHeader><TableHeader></TableHeader></TableRow></TableHead>
          <TableBody>
            {inbound.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.senderFax}</TableCell>
                <TableCell>—</TableCell>
                <TableCell>{f.status}</TableCell>
                <TableCell>{f.patientName ?? 'Unmatched'}</TableCell>
                <TableCell>{f.status === 'unmatched' && <Button size="sm" onClick={() => navigate(`/fax/inbound/${f.id}/match`)}>Match</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </TabPanel>
      <TabPanel active={tab === 'outbound'}>
        <Card padding="lg" style={{ marginBottom: 16 }}>
          <div className="cc-stack cc-stack--sm">
            <FileUpload label="Attach document (demo)" accept=".pdf" onFilesSelected={() => push('File ready to send with fax.', 'info')} />
            <div style={{ display: 'flex', gap: 8 }}>
            <Input placeholder="Recipient fax" value={fax} onChange={(e) => setFax(e.target.value)} />
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Button variant="primary" onClick={send}>Send Fax</Button>
            </div>
          </div>
        </Card>
        <Table>
          <TableHead><TableRow><TableHeader>To</TableHeader><TableHeader>Subject</TableHeader><TableHeader>Status</TableHeader></TableRow></TableHead>
          <TableBody>
            {outbound.map((f) => (
              <TableRow key={f.id}><TableCell>{f.recipientFax}</TableCell><TableCell>{f.subject}</TableCell><TableCell>{f.status}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TabPanel>
    </PageContainer>
  );
}
