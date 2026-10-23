import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight, LogOut, UserRound, CalendarDays, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { asset, useUser, request } from '../api';
export default function Layout() {
  const [open, setOpen] = useState(false);
  const { data: user } = useUser();
  const loc = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="site-shell">
        <header className="header">
          <Link to="/" aria-label="Prescripto home">
            <img
              width="170"
              height="36"
              className="logo"
              src={asset('logo.svg')}
              alt="Prescripto"
            />
          </Link>
          <nav className={open ? 'nav open' : 'nav'} aria-label="Main navigation">
            {[
              ['/', 'Home'],
              ['/doctors', 'All doctors'],
              ['/about', 'About'],
              ['/contact', 'Contact'],
            ].map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            {user ? (
              <details className="user-menu">
                <summary>
                  <span className="avatar">{user.name.charAt(0)}</span>
                  <span className="user-name">{user.name.split(' ')[0]}</span>
                  <span>⌄</span>
                </summary>
                <div className="dropdown">
                  <Link to="/profile">
                    <UserRound size={16} />
                    My profile
                  </Link>
                  <Link to="/appointments">
                    <CalendarDays size={16} />
                    My appointments
                  </Link>
                  {user.role !== 'patient' && (
                    <Link to="/staff">
                      <ShieldCheck size={16} />
                      Staff portal
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      await request('/auth/logout', 'POST');
                      qc.clear();
                      navigate('/');
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              </details>
            ) : (
              <Link className="button small" to="/login">
                Create account <ArrowUpRight size={16} />
              </Link>
            )}
            <button
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="menu-button"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </header>
        <main id="main">
          <Outlet />
        </main>
        <footer>
          <div className="footer-main">
            <div>
              <Link to="/">
                <img
                  className="logo"
                  width="170"
                  height="36"
                  src={asset('logo.svg')}
                  alt="Prescripto"
                />
              </Link>
              <p>
                A simpler way to find the right care.
                <br />
                Discover specialists, choose a time, and take
                <br className="desktop" /> the next step in your health journey.
              </p>
              <span className="footer-note">
                <span className="status-dot" />
                Thoughtful care. Simple scheduling.
              </span>
            </div>
            <div>
              <h3>Explore</h3>
              <Link to="/">Home</Link>
              <Link to="/doctors">Find a doctor</Link>
              <Link to="/about">About us</Link>
              <Link to="/privacy">Privacy policy</Link>
            </div>
            <div>
              <h3>Your care</h3>
              <Link to="/appointments">My appointments</Link>
              <Link to="/profile">My profile</Link>
              <Link to="/contact">Contact & support</Link>
              <Link to="/staff">Staff portal</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Prescripto. All rights reserved.</span>
            <span>Portfolio demo · Fictional providers · No real medical services</span>
          </div>
        </footer>
      </div>
    </>
  );
}
