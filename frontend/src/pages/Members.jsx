import { useState } from 'react';
import { api, fmtDate } from '../api.js';
import { useLoad } from '../hooks.js';
import { ErrorAlert, Field, Loading, Modal, SuccessAlert } from '../components/Ui.jsx';

const empty = { name: '', email: '', phone: '' };

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email';
  if (!/^\+?[0-9][0-9\s-]{6,17}$/.test(f.phone.trim())) e.phone = 'Phone must be 7-18 digits';
  return e;
}

function MemberForm({ member, onClose, onSaved }) {
  const [form, setForm] = useState(member ? { name: member.name, email: member.email, phone: member.phone } : empty);
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
    try {
      if (member) await api.updateMember(member.id, form);
      else await api.createMember(form);
      onSaved(member ? 'Member updated' : 'Member registered');
    } catch (err) {
      setServerError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={member ? 'Edit member' : 'Register member'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body">
          <ErrorAlert message={serverError} />
          <Field label="Name" value={form.name} onChange={set('name')} error={errors.name} maxLength={200} />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
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

export default function Members() {
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: members, error, loading, reload } = useLoad(api.members);

  async function remove(m) {
    if (!window.confirm(`Delete member "${m.name}"?`)) return;
    setActionError('');
    try {
      await api.deleteMember(m.id);
      setMsg('Member deleted');
      reload();
    } catch (e) {
      setActionError(e.message);
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 className="mb-0">Members</h2>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          + Register member
        </button>
      </div>
      <SuccessAlert message={msg} onClose={() => setMsg('')} />
      <ErrorAlert message={error || actionError} onClose={() => setActionError('')} />
      {loading && !members && <Loading />}
      {members && (
        <div className="table-responsive shadow-sm">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.phone}</td>
                  <td>{fmtDate(m.joinedAt)}</td>
                  <td className="text-end text-nowrap">
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setEditing(m)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(m)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!members.length && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No members yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <MemberForm
          member={editing === 'new' ? null : editing}
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
