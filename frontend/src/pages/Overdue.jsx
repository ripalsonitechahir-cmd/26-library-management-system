import { api, fmtDate, fmtMoney } from '../api.js';
import { useLoad } from '../hooks.js';
import { ErrorAlert, Loading } from '../components/Ui.jsx';

export default function Overdue() {
  const { data, error, loading } = useLoad(api.overdue);
  const total = (data || []).reduce((s, l) => s + l.fineAmount, 0);

  return (
    <>
      <h2 className="mb-3">Overdue List</h2>
      <ErrorAlert message={error} />
      {loading && !data && <Loading />}
      {data && (
        <>
          <p className="text-muted">
            {data.length} overdue loan{data.length === 1 ? '' : 's'} &middot; outstanding fines {fmtMoney(total)}
          </p>
          <div className="table-responsive shadow-sm">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Due</th>
                  <th>Days late</th>
                  <th>Fine</th>
                </tr>
              </thead>
              <tbody>
                {data.map((l) => (
                  <tr key={l.id}>
                    <td>{l.book.title}</td>
                    <td>{l.member.name}</td>
                    <td>{l.member.email}</td>
                    <td>{fmtDate(l.dueAt)}</td>
                    <td>{Math.ceil((Date.now() - new Date(l.dueAt)) / 86400000)}</td>
                    <td className="fw-semibold text-danger">{fmtMoney(l.fineAmount)}</td>
                  </tr>
                ))}
                {!data.length && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No overdue loans
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
