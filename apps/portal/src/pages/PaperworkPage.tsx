import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type PaperworkStep } from '@careconnect/api-client';
import { Button, Card, CardContent, Input, Select } from '@careconnect/design-system';

export function PaperworkPage() {
  const { id: appointmentId, questionnaireId } = useParams<{ id: string; questionnaireId?: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof api.getPaperwork>> | null>(null);
  const [step, setStep] = useState<PaperworkStep | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!appointmentId) return;
    api.getPaperwork(appointmentId).then((p) => {
      setProgress(p);
      const active = questionnaireId
        ? p.steps.find((s) => s.id === questionnaireId || s.slug === questionnaireId)
        : p.steps.find((s) => !s.completed) ?? p.steps[0];
      if (active) {
        setStep(active);
        setAnswers(active.answers ?? {});
      }
    });
  }, [appointmentId, questionnaireId]);

  const setField = (id: string, value: unknown) => setAnswers((a) => ({ ...a, [id]: value }));

  const submit = async () => {
    if (!appointmentId || !step) return;
    setSaving(true);
    try {
      const updated = await api.submitPaperwork(appointmentId, step.id, answers);
      setProgress(updated);
      const next = updated.steps.find((s) => !s.completed);
      if (next) {
        setStep(next);
        setAnswers(next.answers ?? {});
        navigate(`/visits/${appointmentId}/paperwork/${next.slug}`, { replace: true });
      } else {
        navigate(`/visits/${appointmentId}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!step || !progress) return <p>Loading paperwork...</p>;

  const page = step.schema.pages[0];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: 'var(--cc-text-muted)', margin: 0 }}>
          Intake paperwork · {progress.completed} of {progress.total} complete ({progress.percent}%)
        </p>
        <div style={{ height: 6, background: 'var(--cc-border)', borderRadius: 3, marginTop: 8 }}>
          <div style={{ width: `${progress.percent}%`, height: '100%', background: 'var(--cc-primary)', borderRadius: 3 }} />
        </div>
      </div>

      <h1 style={{ fontSize: 'var(--cc-text-2xl)' }}>{step.title}</h1>
      <Card padding="lg">
        <CardContent>
          <div className="portal-form">
            {page.fields.map((field) => {
              if (field.type === 'textarea') {
                return (
                  <label key={field.id} style={{ display: 'block' }}>
                    <span style={{ fontSize: 'var(--cc-text-sm)', fontWeight: 500 }}>{field.label}</span>
                    <textarea
                      className="cc-input"
                      rows={3}
                      value={String(answers[field.id] ?? '')}
                      onChange={(e) => setField(field.id, e.target.value)}
                      style={{ width: '100%', marginTop: 4 }}
                    />
                  </label>
                );
              }
              if (field.type === 'checkbox') {
                return (
                  <label key={field.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={!!answers[field.id]} onChange={(e) => setField(field.id, e.target.checked)} />
                    <span>{field.label}</span>
                  </label>
                );
              }
              if (field.type === 'select') {
                return (
                  <Select
                    key={field.id}
                    label={field.label}
                    value={String(answers[field.id] ?? '')}
                    onChange={(e) => setField(field.id, e.target.value)}
                    options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
                    fullWidth
                  />
                );
              }
              return (
                <Input
                  key={field.id}
                  label={field.label}
                  type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                  placeholder={field.placeholder}
                  value={String(answers[field.id] ?? '')}
                  onChange={(e) => setField(field.id, e.target.value)}
                  fullWidth
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="portal-actions">
        <Button variant="ghost" onClick={() => navigate(`/visits/${appointmentId}`)}>Back to Visit</Button>
        <Button variant="primary" loading={saving} onClick={submit}>
          {progress.steps.filter((s) => !s.completed).length <= 1 ? 'Submit & Finish' : 'Save & Continue'}
        </Button>
      </div>
    </>
  );
}
