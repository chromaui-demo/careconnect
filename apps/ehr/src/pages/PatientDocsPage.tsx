import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type PatientDocument } from '@careconnect/api-client';
import { Button, EmptyState, FileUpload, Input, PageContainer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@careconnect/design-system';
import { PatientChartNav } from './PatientChartInfoPage';

export function PatientDocsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { push } = useToast();
  const [docs, setDocs] = useState<PatientDocument[]>([]);
  const [title, setTitle] = useState('');

  const load = () => { if (id) api.getPatientDocuments(id).then(setDocs); };
  useEffect(() => { load(); }, [id]);

  const upload = async (fileName?: string) => {
    if (!id || !title) return;
    await api.uploadPatientDocument(id, { title, fileName: fileName ?? `${title.replace(/\s+/g, '-').toLowerCase()}.pdf` });
    setTitle('');
    push('Document uploaded.', 'success');
    load();
  };

  return (
    <PageContainer title="Patient Documents" actions={<Button variant="secondary" onClick={() => navigate(`/patient/${id}`)}>Back</Button>}>
      <PatientChartNav id={id!} section="docs" />
      <div className="cc-stack">
        <Input placeholder="Document title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <FileUpload
          label="Upload file"
          accept=".pdf,.jpg,.png"
          hint="PDF or image files"
          onFilesSelected={(files) => upload(files[0]?.name)}
        />
        <Button variant="primary" onClick={() => upload()}>Save metadata only</Button>
      </div>
      {docs.length === 0 ? (
        <EmptyState title="No documents" description="Upload patient documents to see them listed here." />
      ) : (
        <Table>
          <TableHead><TableRow><TableHeader>Title</TableHeader><TableHeader>Category</TableHeader><TableHeader>Uploaded</TableHeader></TableRow></TableHead>
          <TableBody>
            {docs.map((d) => (
              <TableRow key={d.id}><TableCell>{d.title}</TableCell><TableCell>{d.category}</TableCell><TableCell>{d.uploadedAt}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageContainer>
  );
}
