import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();

  const cards = [
    { icon: '🏥', title: 'Book Appointment', desc: 'Choose in-person or virtual care', path: '/book/service' },
    { icon: '💻', title: 'Virtual Visit', desc: 'See a provider from home', path: '/book?mode=virtual' },
    { icon: '🚶', title: 'Walk-In', desc: 'Register for urgent care', path: '/walk-in' },
    { icon: '📋', title: 'My Visits', desc: 'Upcoming and past appointments', path: '/visits' },
    { icon: '💊', title: 'Medications', desc: 'View prescriptions and request refills', path: '/medications' },
    { icon: '🧪', title: 'Test Results', desc: 'Lab and diagnostic results', path: '/results' },
    { icon: '✉️', title: 'Messages', desc: 'Secure messaging with your care team', path: '/messages' },
    { icon: '💳', title: 'Pay Bills', desc: 'View balance and pay online', path: '/bills' },
    { icon: '🔄', title: 'Request Refill', desc: 'Submit a medication refill request', path: '/medications/refill' },
    { icon: '👨‍👩‍👧', title: 'My Patients', desc: 'Manage family members on your account', path: '/my-patients' },
  ];

  return (
    <>
      <div className="portal-hero">
        <h1>Welcome to CareConnect</h1>
        <p>Book visits, view results, message your care team, manage medications, and pay bills — all in one place.</p>
      </div>

      <div className="portal-cards">
        {cards.map((c) => (
          <button key={c.path} type="button" className="portal-card-option" onClick={() => navigate(c.path)}>
            <span style={{ fontSize: '2rem' }}>{c.icon}</span>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
          </button>
        ))}
      </div>
    </>
  );
}
