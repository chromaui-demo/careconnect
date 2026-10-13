import type { ReactNode } from 'react';
import { PageContainer, PageHeader } from '@careconnect/design-system';

export interface PortalPageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PortalPage({ title, subtitle, actions, children }: PortalPageProps) {
  return (
    <PageContainer>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="cc-stack">{children}</div>
    </PageContainer>
  );
}
