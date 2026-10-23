import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Home from './pages/Home';
import './styles.css';
const Doctors = lazy(() => import('./pages/Doctors'));
const Booking = lazy(() => import('./pages/Booking'));
const Auth = lazy(() => import('./pages/Auth'));
const Account = lazy(() => import('./pages/Account'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Information = lazy(() => import('./pages/Information'));
const Staff = lazy(() => import('./pages/Staff'));
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="empty">
        <h1>Something went wrong</h1>
        <p>Please reload the page to continue.</p>
        <a className="button" href="/">
          Return home
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route
                path="doctors"
                element={
                  <Suspense fallback={<div className="skeleton" />}>
                    <Doctors />
                  </Suspense>
                }
              />
              <Route
                path="doctors/:id"
                element={
                  <Suspense fallback={<div className="skeleton" />}>
                    <Booking />
                  </Suspense>
                }
              />
              <Route
                path="login"
                element={
                  <Suspense fallback={<div className="skeleton" />}>
                    <Auth />
                  </Suspense>
                }
              />
              <Route
                path="profile"
                element={
                  <Suspense fallback={<div className="skeleton" />}>
                    <Account />
                  </Suspense>
                }
              />
              <Route
                path="appointments"
                element={
                  <Suspense fallback={<div className="skeleton" />}>
                    <Appointments />
                  </Suspense>
                }
              />
              <Route
                path="staff"
                element={
                  <Suspense fallback={<div className="skeleton" />}>
                    <Staff />
                  </Suspense>
                }
              />
              <Route
                path="about"
                element={
                  <Suspense fallback={<div className="skeleton" />}>
                    <Information type="about" />
                  </Suspense>
                }
              />
              <Route
                path="contact"
                element={
                  <Suspense fallback={<div className="skeleton" />}>
                    <Information type="contact" />
                  </Suspense>
                }
              />
              <Route
                path="privacy"
                element={
                  <Suspense fallback={<div className="skeleton" />}>
                    <Information type="privacy" />
                  </Suspense>
                }
              />
              <Route
                path="*"
                element={
                  <div className="empty">
                    <h1>Page not found</h1>
                    <a href="/" className="button">
                      Back to home
                    </a>
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
