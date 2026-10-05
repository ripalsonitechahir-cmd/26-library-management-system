import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Books from './pages/Books.jsx';
import Members from './pages/Members.jsx';
import IssueReturn from './pages/IssueReturn.jsx';
import Overdue from './pages/Overdue.jsx';

const links = [
  ['/', 'Dashboard'],
  ['/books', 'Books'],
  ['/members', 'Members'],
  ['/loans', 'Issue / Return'],
  ['/overdue', 'Overdue List'],
];

export default function App() {
  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand">Library Management</span>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#nav"
            aria-label="Toggle navigation"
            onClick={(e) => e.currentTarget.nextSibling.classList.toggle('show')}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="nav">
            <ul className="navbar-nav ms-auto">
              {links.map(([to, label]) => (
                <li className="nav-item" key={to}>
                  <NavLink end={to === '/'} to={to} className="nav-link">
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/books" element={<Books />} />
          <Route path="/members" element={<Members />} />
          <Route path="/loans" element={<IssueReturn />} />
          <Route path="/overdue" element={<Overdue />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
