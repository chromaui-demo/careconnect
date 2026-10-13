export interface QuestionnaireField {
  id: string;
  type: 'text' | 'tel' | 'email' | 'date' | 'select' | 'textarea' | 'checkbox' | 'radio';
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface QuestionnairePage {
  slug: string;
  title: string;
  fields: QuestionnaireField[];
}

export interface QuestionnaireSchema {
  pages: QuestionnairePage[];
}

export const DEFAULT_QUESTIONNAIRES: Array<{ title: string; slug: string; schema: QuestionnaireSchema }> = [
  {
    title: 'Contact Information',
    slug: 'contact-information',
    schema: {
      pages: [{
        slug: 'contact',
        title: 'Contact Information',
        fields: [
          { id: 'phone', type: 'tel', label: 'Mobile Phone', required: true, placeholder: '(555) 123-4567' },
          { id: 'email', type: 'email', label: 'Email', required: true },
          { id: 'addressLine', type: 'text', label: 'Street Address', required: true },
          { id: 'city', type: 'text', label: 'City', required: true },
          { id: 'state', type: 'text', label: 'State', required: true },
          { id: 'zip', type: 'text', label: 'ZIP Code', required: true },
        ],
      }],
    },
  },
  {
    title: 'Medical History',
    slug: 'medical-history',
    schema: {
      pages: [{
        slug: 'history',
        title: 'Medical History',
        fields: [
          { id: 'allergies', type: 'textarea', label: 'Allergies (list each, or "None")', required: true },
          { id: 'medications', type: 'textarea', label: 'Current Medications', required: true },
          { id: 'conditions', type: 'textarea', label: 'Medical Conditions', required: false },
          { id: 'surgeries', type: 'textarea', label: 'Past Surgeries', required: false },
        ],
      }],
    },
  },
  {
    title: 'Insurance',
    slug: 'insurance',
    schema: {
      pages: [{
        slug: 'insurance',
        title: 'Insurance Information',
        fields: [
          { id: 'payerName', type: 'text', label: 'Insurance Company', required: true },
          { id: 'memberId', type: 'text', label: 'Member ID', required: true },
          { id: 'groupNumber', type: 'text', label: 'Group Number', required: false },
          { id: 'subscriberName', type: 'text', label: 'Subscriber Name', required: true },
        ],
      }],
    },
  },
  {
    title: 'Consent Forms',
    slug: 'consent',
    schema: {
      pages: [{
        slug: 'consent',
        title: 'Consent & Policies',
        fields: [
          { id: 'hipaaConsent', type: 'checkbox', label: 'I agree to the HIPAA Notice of Privacy Practices', required: true },
          { id: 'financialConsent', type: 'checkbox', label: 'I agree to financial responsibility terms', required: true },
          { id: 'telemedConsent', type: 'checkbox', label: 'I consent to telemedicine services (if applicable)', required: false },
        ],
      }],
    },
  },
];
