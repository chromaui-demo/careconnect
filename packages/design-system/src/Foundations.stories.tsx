import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import tokens from './figma/tokens.json';
import { figmaDesign } from './figma/links';

// Token sheets, driven by src/figma/tokens.json (generated from tokens.css).
// They serve three purposes: a reference page for designers, the swatch frames
// story.to.design imports into the Figma library, and a Chromatic snapshot that
// flags any token change as a visual diff.

type Token = { $type: string; $value: unknown; $extensions: { 'com.careconnect': { cssVariable: string; cssValue: string } } };
type Group = Record<string, Token>;

const entries = (group: Group) => Object.entries(group).map(([name, token]) => ({ name, ...token['$extensions']['com.careconnect'] }));

const meta: Meta = {
  title: 'Foundations/Tokens',
  // Out of the MCP components manifest: the sheets render local helpers an agent
  // cannot import. Agents get token guidance from AGENTS.md instead.
  tags: ['!manifest'],
  parameters: { design: figmaDesign('Foundations/Tokens'), layout: 'padded' },
};

export default meta;
type Story = StoryObj;

const label: CSSProperties = { fontSize: 'var(--cc-text-xs)', color: 'var(--cc-text-secondary)', fontFamily: 'var(--cc-font-mono)' };
const heading: CSSProperties = { margin: '0 0 12px', fontSize: 'var(--cc-text-lg)', fontWeight: 600 };

function Sheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={heading}>{title}</h2>
      {children}
    </section>
  );
}

const colorGroups = [
  { title: 'Brand', match: /^(primary|accent)(-(light|dark|subtle))?$/ },
  { title: 'Status', match: /^(success|warning|error|info)$/ },
  { title: 'Status text & tints', match: /^(primary-text|(success|warning|error|info)-(text|subtle))$/ },
  { title: 'Surfaces & borders', match: /^(bg|border)/ },
  { title: 'Text', match: /^text/ },
];

export const Colors: Story = {
  render: () => (
    <div>
      {colorGroups.map((group) => (
        <Sheet key={group.title} title={group.title}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {entries(tokens.color as Group)
              .filter((t) => group.match.test(t.name))
              .map((t) => (
                <div key={t.name} style={{ border: '1px solid var(--cc-border)', borderRadius: 'var(--cc-radius-md)', overflow: 'hidden' }}>
                  <div style={{ height: 64, background: `var(${t.cssVariable})` }} />
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontWeight: 500 }}>{t.name}</div>
                    <div style={label}>{t.cssValue}</div>
                  </div>
                </div>
              ))}
          </div>
        </Sheet>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div>
      <Sheet title="Families">
        {entries(tokens.font.family as Group).map((t) => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--cc-border)' }}>
            <span style={{ ...label, width: 96 }}>{t.name}</span>
            <span style={{ fontFamily: `var(${t.cssVariable})`, fontSize: 'var(--cc-text-xl)' }}>Check in patient — 08:30</span>
            <span style={label}>{t.cssValue}</span>
          </div>
        ))}
      </Sheet>
      <Sheet title="Sizes">
        {entries(tokens.font.size as Group).map((t) => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--cc-border)' }}>
            <span style={{ ...label, width: 96 }}>{t.name}</span>
            <span style={{ fontSize: `var(${t.cssVariable})`, lineHeight: 1.2 }}>Patient queue</span>
            <span style={label}>{t.cssValue}</span>
          </div>
        ))}
      </Sheet>
    </div>
  ),
};

export const Spacing: Story = {
  render: () => (
    <Sheet title="Spacing scale">
      {entries(tokens.space as Group).map((t) => (
        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0' }}>
          <span style={{ ...label, width: 96 }}>space-{t.name}</span>
          <div style={{ width: `var(${t.cssVariable})`, height: 16, background: 'var(--cc-primary)', borderRadius: 2 }} />
          <span style={label}>{t.cssValue}</span>
        </div>
      ))}
    </Sheet>
  ),
};

export const Radius: Story = {
  render: () => (
    <Sheet title="Corner radius">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {entries(tokens.radius as Group).map((t) => (
          <div key={t.name} style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, background: 'var(--cc-primary-subtle)', border: '2px solid var(--cc-primary)', borderRadius: `var(${t.cssVariable})` }} />
            <div style={{ marginTop: 8, fontWeight: 500 }}>{t.name}</div>
            <div style={label}>{t.cssValue}</div>
          </div>
        ))}
      </div>
    </Sheet>
  ),
};

export const Shadows: Story = {
  render: () => (
    <Sheet title="Elevation">
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', padding: 16 }}>
        {entries(tokens.shadow as Group).map((t) => (
          <div key={t.name} style={{ textAlign: 'center' }}>
            <div style={{ width: 120, height: 80, background: 'var(--cc-bg-elevated)', borderRadius: 'var(--cc-radius-md)', boxShadow: `var(${t.cssVariable})` }} />
            <div style={{ marginTop: 12, fontWeight: 500 }}>{t.name}</div>
            <div style={label}>{t.cssValue}</div>
          </div>
        ))}
      </div>
    </Sheet>
  ),
};
