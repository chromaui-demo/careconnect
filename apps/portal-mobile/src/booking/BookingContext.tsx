import { createContext, useContext, useState, type ReactNode } from 'react';
import type { TimeSlot } from '@careconnect/api-client';

/** Choices carried across the booking steps (the web portal keeps them in the URL). */
export interface BookingDraft {
  mode: 'in-person' | 'virtual';
  reason: string;
  location: string;
  visitType: 'new' | 'followup';
  slot: TimeSlot | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
}

export const emptyDraft: BookingDraft = {
  mode: 'in-person',
  reason: '',
  location: 'Main Clinic',
  visitType: 'followup',
  slot: null,
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  phone: '',
  email: '',
};

interface BookingContextValue {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  reset: (seed?: Partial<BookingDraft>) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  return (
    <BookingContext.Provider
      value={{
        draft,
        update: (patch) => setDraft((d) => ({ ...d, ...patch })),
        reset: (seed) => setDraft({ ...emptyDraft, ...seed }),
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}

export const REASONS = [
  'Cough and/or congestion',
  'Fever',
  'Throat pain',
  'Ear pain',
  'Abdominal pain',
  'Back pain',
  'Skin rash',
  'Annual physical',
  'Other',
];

export const LOCATIONS = ['Main Clinic', 'Urgent Care West'];
