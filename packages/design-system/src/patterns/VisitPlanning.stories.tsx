import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState } from 'react';
import { expect } from 'storybook/test';
import { AppointmentSummaryCard, type AppointmentSummary } from '../components/AppointmentSummaryCard';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { figmaDesign } from '../figma/links';
import { allModes } from '../../.storybook/modes';
import './VisitPlanning.stories.css';

const appointment: AppointmentSummary = {
  id: 'visit-wellness',
  reason: 'Annual wellness visit',
  dateLabel: 'Tuesday, October 20, 2026',
  timeLabel: '9:30 AM CDT',
  dateTime: '2026-10-20T09:30:00-05:00',
  provider: 'Dr. Maya Chen',
  location: 'Northside Clinic · Suite 200',
  serviceMode: 'in-person',
};

type Screen = 'home' | 'details' | 'empty';

// A story-only composition: navigation is local state, with no API or app routing.
function VisitPlanningPrototype({ initialScreen = 'home' }: { initialScreen?: Screen }) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousScreen = useRef(screen);
  useEffect(() => {
    if (previousScreen.current !== screen) heading.current?.focus();
    previousScreen.current = screen;
  }, [screen]);

  return (
    <div className="cc-visit-planning">
      <header className="cc-visit-planning__brand"><span>CareConnect</span><span>Patient portal</span></header>
      <main className="cc-visit-planning__main">
        {screen === 'details' ? (
          <>
            <Button variant="ghost" onClick={() => setScreen('home')}>← Back to My care</Button>
            <h1 ref={heading} tabIndex={-1}>Visit details</h1>
            <p className="cc-visit-planning__intro">Everything you need for your upcoming appointment.</p>
            <Card padding="lg">
              <h2>{appointment.reason}</h2>
              <p><time dateTime={appointment.dateTime}>{appointment.dateLabel} · {appointment.timeLabel}</time></p>
              <dl className="cc-visit-planning__details">
                <div><dt>Provider</dt><dd>{appointment.provider}</dd></div>
                <div><dt>Location</dt><dd>{appointment.location}</dd></div>
              </dl>
              <section className="cc-visit-planning__preparation">
                <h3>Before your visit</h3>
                <p>Bring your photo ID, insurance card, and current medication list.</p>
              </section>
            </Card>
          </>
        ) : (
          <>
            <h1 ref={heading} tabIndex={-1}>My care</h1>
            <p className="cc-visit-planning__intro">Your upcoming care, in one place.</p>
            <section aria-labelledby="upcoming-visits">
              <h2 id="upcoming-visits">Upcoming visits</h2>
              {screen === 'empty' ? (
                <Card padding="lg"><h3>No upcoming visits</h3><p>When you schedule a visit, its details will appear here.</p></Card>
              ) : <AppointmentSummaryCard appointment={appointment} onViewVisit={() => setScreen('details')} />}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const meta = {
  title: 'Patterns/Visit Planning',
  // This helper is not a public component and must not become agent API context.
  tags: ['!manifest'],
  parameters: {
    layout: 'fullscreen',
    design: figmaDesign('Patterns/Visit Planning'),
    chromatic: { modes: { mobile: allModes.mobile, desktop: allModes.desktop } },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;

export const Summary: Story = { render: () => <VisitPlanningPrototype /> };
export const Details: Story = { render: () => <VisitPlanningPrototype initialScreen="details" /> };
export const NoUpcomingVisits: Story = { render: () => <VisitPlanningPrototype initialScreen="empty" /> };

export const SummaryToDetailsAndBack: Story = {
  render: () => <VisitPlanningPrototype />,
  play: async ({ canvas, userEvent, step }) => {
    await step('Open the appointment from the summary', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'View visit' }));
      await expect(canvas.getByRole('heading', { level: 1, name: 'Visit details' })).toHaveFocus();
      await expect(canvas.getByText(appointment.provider)).toBeVisible();
      await expect(canvas.getByText(appointment.location)).toBeVisible();
      await expect(canvas.getByRole('heading', { name: 'Before your visit' })).toBeVisible();
    });
    await step('Return to the same upcoming appointment', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '← Back to My care' }));
      await expect(canvas.getByRole('heading', { level: 1, name: 'My care' })).toHaveFocus();
      await expect(canvas.getByRole('heading', { name: appointment.reason })).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'View visit' })).toBeVisible();
    });
  },
};
