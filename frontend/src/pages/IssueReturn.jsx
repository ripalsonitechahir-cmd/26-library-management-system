import { useState } from 'react';
import { api, fmtDate, fmtMoney } from '../api.js';
import { useLoad } from '../hooks.js';
import { ErrorAlert, Loading, SuccessAlert } from '../components/Ui.jsx';

export default function IssueReturn() {
  const books = useLoad(() => api.books(''));
  const members = useLoad(api.members);
  const loans = useLoad(() => api.loans('active'));
  const [bookId, setBookId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const available = (books.data || []).filter((b) => b.availableCopies > 0);

  async function refresh() {
    await Promise.all([books.reload(), loans.reload()]);
  }

  async function issue(e) {
    e.preventDefault();
    setError('');
    if (!bookId || !memberId) {
      setError('Select both a book and a member');
      return;
    }
    setBusy(true);
    try {
      const loan = await api.issue({ bookId: Number(bookId), memberId: Number(memberId) });
      setMsg(`Issued "${loan.book.title}" to ${loan.member.name}. Due ${fmtDate(loan.dueAt)}`);
      setBookId('');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function giveBack(loan) {
    setError('');
    try {
      const r = await api.returnLoan(loan.id);
      setMsg(
        r.fineAmount > 0
          ? `Returned "${r.book.title}". Overdue fine: ${fmtMoney(r.fineAmount)}`
          : `Returned "${r.book.title}". No fine`
      );
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h2 className="mb-3">Issue / Return</h2>
      <SuccessAlert message={msg} onClose={() => setMsg('')} />
      <ErrorAlert message={error || books.error || members.error || loans.error} onClose={() => setError('')} />

      <form className="card card-body mb-4 shadow-sm" onSubmit={issue}>
        <h5>Issue a book (due in 14 days)</h5>
        <div className="row g-3 align-items-end">
          <div className="col-md-5">
            <label className="form-label" htmlFor="book">
              Book
            </label>
            <select id="book" className="form-select" value={bookId} onChange={(e) => setBookId(e.target.value)}>
              <option value="">Select a book...</option>
              {available.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.availableCopies} available)
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label" htmlFor="member">
              Member
            </label>
            <select id="member" className="form-select" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select a member...</option>
              {(members.data || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2 d-grid">
            <button className="btn btn-primary" disabled={busy}>
              Issue
            </button>
          </div>
        </div>
      </form>

      <h5>Books currently issued</h5>
      {loans.loading && !loans.data && <Loading />}
      {loans.data && (
        <div className="table-responsive shadow-sm">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Book</th>
                <th>Member</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Fine so far</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loans.data.map((l) => (
                <tr key={l.id} className={l.overdue ? 'table-danger' : ''}>
                  <td>{l.book.title}</td>
                  <td>{l.member.name}</td>
                  <td>{fmtDate(l.issuedAt)}</td>
                  <td>
                    {fmtDate(l.dueAt)} {l.overdue && <span className="badge text-bg-danger">Overdue</span>}
                  </td>
                  <td>{fmtMoney(l.fineAmount)}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-success" onClick={() => giveBack(l)}>
                      Return
                    </button>
                  </td>
                </tr>
              ))}
              {!loans.data.length && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No books are currently issued
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
