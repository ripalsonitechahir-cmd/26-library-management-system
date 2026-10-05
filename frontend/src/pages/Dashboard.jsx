import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { ErrorAlert, Loading } from '../components/Ui.jsx';

export default function Dashboard() {
  const { data, error, loading } = useLoad(api.dashboard);

  const cards = data && [
    ['Total Books', data.totalBooks, 'primary', `${data.totalCopies} copies in total`],
    ['Issued Books', data.issuedBooks, 'warning', `${data.availableCopies} copies available`],
    ['Overdue', data.overdueCount, 'danger', 'Past their due date'],
    ['Members', data.totalMembers, 'success', 'Registered members'],
  ];

  return (
    <>
      <h2 className="mb-3">Dashboard</h2>
      <ErrorAlert message={error} />
      {loading && !data && <Loading />}
      {cards && (
        <div className="row g-3">
          {cards.map(([label, value, color, hint]) => (
            <div className="col-6 col-lg-3" key={label}>
              <div className={`card stat-card border-${color} h-100`}>
                <div className="card-body">
                  <div className="text-muted">{label}</div>
                  <div className={`display-6 text-${color}`} data-testid={label}>
                    {value}
                  </div>
                  <small className="text-muted">{hint}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 d-flex flex-wrap gap-2">
        <Link className="btn btn-primary" to="/loans">
          Issue / Return a book
        </Link>
        <Link className="btn btn-outline-secondary" to="/books">
          Manage books
        </Link>
        <Link className="btn btn-outline-danger" to="/overdue">
          View overdue
        </Link>
      </div>
    </>
  );
}
