import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { ErrorAlert, Field, Loading, Modal, SuccessAlert } from '../components/Ui.jsx';

const empty = { title: '', author: '', isbn: '', totalCopies: 1 };

function validate(f) {
  const e = {};
  if (!f.title.trim()) e.title = 'Title is required';
  if (!f.author.trim()) e.author = 'Author is required';
  if (!/^(\d{9}[\dXx]|\d{13})$/.test(f.isbn.replace(/[\s-]/g, ''))) {
    e.isbn = 'ISBN must be a valid ISBN-10 or ISBN-13';
  }
  const n = Number(f.totalCopies);
  if (!Number.isInteger(n) || n < 1) e.totalCopies = 'Copies must be a whole number of at least 1';
  return e;
}

function BookForm({ book, onClose, onSaved }) {
  const [form, setForm] = useState(book ? { ...book } : empty);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    setServerError('');
    const body = { ...form, totalCopies: Number(form.totalCopies) };
    try {
      if (book) await api.updateBook(book.id, body);
      else await api.createBook(body);
      onSaved(book ? 'Book updated' : 'Book added');
    } catch (err) {
      setServerError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={book ? 'Edit book' : 'Add book'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body">
          <ErrorAlert message={serverError} />
          <Field label="Title" value={form.title} onChange={set('title')} error={errors.title} maxLength={200} />
          <Field label="Author" value={form.author} onChange={set('author')} error={errors.author} maxLength={200} />
          <Field label="ISBN" value={form.isbn} onChange={set('isbn')} error={errors.isbn} placeholder="10 or 13 digits" />
          <Field
            label="Copies"
            type="number"
            min="1"
            value={form.totalCopies}
            onChange={set('totalCopies')}
            error={errors.totalCopies}
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Books() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | book
  const [msg, setMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: books, error, loading, reload } = useLoad(() => api.books(query), [query]);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function remove(b) {
    if (!window.confirm(`Delete "${b.title}"?`)) return;
    setActionError('');
    try {
      await api.deleteBook(b.id);
      setMsg('Book deleted');
      reload();
    } catch (e) {
      setActionError(e.message);
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 className="mb-0">Books</h2>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Add book
        </button>
      </div>
      <input
        className="form-control mb-3"
        type="search"
        placeholder="Search by title, author or ISBN"
        aria-label="Search books"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <SuccessAlert message={msg} onClose={() => setMsg('')} />
      <ErrorAlert message={error || actionError} onClose={() => setActionError('')} />
      {loading && !books && <Loading />}
      {books && (
        <div className="table-responsive shadow-sm">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>ISBN</th>
                <th className="text-center">Available / Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id}>
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td>{b.isbn}</td>
                  <td className="text-center">
                    <span className={`badge ${b.availableCopies ? 'text-bg-success' : 'text-bg-secondary'}`}>
                      {b.availableCopies} / {b.totalCopies}
                    </span>
                  </td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setEditing(b)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(b)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!books.length && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No books found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <BookForm
          book={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            setMsg(m);
            reload();
          }}
        />
      )}
    </>
  );
}
