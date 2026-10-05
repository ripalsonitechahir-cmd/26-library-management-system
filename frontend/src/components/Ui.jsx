import { useEffect } from 'react';

export function ErrorAlert({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger alert-dismissible" role="alert">
      {message}
      {onClose && <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />}
    </div>
  );
}

export function SuccessAlert({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="alert alert-success" role="status">
      {message}
    </div>
  );
}

export function Loading() {
  return (
    <div className="text-center text-muted py-4">
      <div className="spinner-border spinner-border-sm me-2" role="status" /> Loading...
    </div>
  );
}

// Controlled text field with inline validation message.
export function Field({ label, error, ...props }) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input className={`form-control${error ? ' is-invalid' : ''}`} {...props} />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            {children}
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}
