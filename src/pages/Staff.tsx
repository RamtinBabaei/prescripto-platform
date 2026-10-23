import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Users, Stethoscope, DollarSign, Plus, ArrowRight } from 'lucide-react';
import { request, useDoctors, useUser, money, specialties } from '../api';
import type { Appointment, Doctor } from '../types';
import { Loading, ErrorMessage } from '../components/Feedback';
const blank: Doctor = {
  id: '',
  name: '',
  speciality: 'General physician',
  degree: 'MBBS',
  experience: 1,
  about: '',
  fee: 50,
  image: '/assets/doc1.webp',
  address: '',
  available: 1,
};
function DoctorForm({ doctor, onDone }: { doctor: Doctor; onDone: () => void }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (f: FormData) =>
      request('/admin/doctors' + (doctor.id ? '/' + doctor.id : ''), doctor.id ? 'PATCH' : 'POST', {
        ...Object.fromEntries(f),
        experience: Number(f.get('experience')),
        fee: Number(f.get('fee')),
        available: f.get('available') ? 1 : 0,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['doctors'] });
      await qc.invalidateQueries({ queryKey: ['summary'] });
      onDone();
    },
  });
  return (
    <form
      className="staff-editor form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(new FormData(e.currentTarget));
      }}
    >
      <h2 className="span-2">{doctor.id ? 'Edit doctor' : 'Add doctor'}</h2>
      <label>
        Full name
        <input name="name" required minLength={3} defaultValue={doctor.name} />
      </label>
      <label>
        Speciality
        <select name="speciality" defaultValue={doctor.speciality}>
          {specialties.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Qualifications
        <input name="degree" required defaultValue={doctor.degree} />
      </label>
      <label>
        Experience (years)
        <input
          name="experience"
          type="number"
          min="0"
          max="70"
          required
          defaultValue={doctor.experience}
        />
      </label>
      <label>
        Consultation fee (USD)
        <input name="fee" type="number" min="1" max="5000" required defaultValue={doctor.fee} />
      </label>
      <label>
        Portrait
        <select name="image" defaultValue={doctor.image}>
          {Array.from({ length: 15 }, (_, i) => (
            <option key={i} value={'/assets/doc' + (i + 1) + '.webp'}>
              Portrait {i + 1}
            </option>
          ))}
        </select>
      </label>
      <label className="span-2">
        Clinic address
        <input name="address" required minLength={5} defaultValue={doctor.address} />
      </label>
      <label className="span-2">
        About
        <textarea
          name="about"
          required
          minLength={30}
          maxLength={2000}
          defaultValue={doctor.about}
        />
      </label>
      <label className="check-label">
        <input type="checkbox" name="available" defaultChecked={!!doctor.available} />
        Available for bookings
      </label>
      <div className="span-2">
        {mutation.error && <ErrorMessage message={mutation.error.message} />}
        <div className="inline-actions">
          <button className="button" disabled={mutation.isPending}>
            Save doctor
          </button>
          <button type="button" className="outline-button" onClick={onDone}>
            Close
          </button>
        </div>
      </div>
    </form>
  );
}
export default function Staff() {
  const { data: user, isPending } = useUser();
  const authorized = !!user && user.role !== 'patient';
  const admin = user?.role === 'admin';
  const qc = useQueryClient();
  const [tab, setTab] = useState('appointments');
  const [editing, setEditing] = useState<Doctor | null>(null);
  const doctors = useDoctors();
  const appointments = useQuery({
    queryKey: ['staff-appointments'],
    queryFn: () => request<Appointment[]>('/appointments'),
    enabled: authorized,
  });
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () =>
      request<{ doctors: number; patients: number; upcoming: number; revenue: number }>(
        '/admin/summary',
      ),
    enabled: admin,
  });
  const patients = useQuery({
    queryKey: ['patients'],
    queryFn: () =>
      request<{ id: string; name: string; email: string; created_at: string }[]>('/admin/patients'),
    enabled: admin && tab === 'patients',
  });
  const ownDoctor = useQuery({
    queryKey: ['own-doctor'],
    queryFn: () => request<Doctor>('/staff/doctor'),
    enabled: authorized && !admin,
  });
  const action = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      request('/appointments/' + id + '/' + action, 'POST'),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['staff-appointments'] });
      await qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
  const profile = useMutation({
    mutationFn: (f: FormData) =>
      request('/staff/doctor', 'PATCH', {
        about: f.get('about'),
        address: f.get('address'),
        fee: Number(f.get('fee')),
        available: f.get('available') ? 1 : 0,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['own-doctor'] });
      await qc.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
  if (isPending) return <Loading />;
  if (!authorized)
    return (
      <div className="empty">
        <Stethoscope size={40} />
        <h1>Clinic staff portal</h1>
        <p>Sign in with your provisioned doctor or administrator account.</p>
        <Link className="button" to="/login?next=/staff">
          Sign in
          <ArrowRight size={18} />
        </Link>
        <p className="muted">Staff access is granted by the platform operator.</p>
      </div>
    );
  return (
    <div className="page staff-page">
      <div className="eyebrow">{admin ? 'ADMINISTRATION' : 'YOUR PRACTICE'}</div>
      <h1>Welcome, {user?.name}.</h1>
      <p className="page-subtitle">A clear view of your clinic, so you can focus on care.</p>
      {admin ? (
        <div className="stat-grid">
          {[
            [Stethoscope, 'Doctors', summary.data?.doctors],
            [Users, 'Patients', summary.data?.patients],
            [CalendarDays, 'Booked appointments', summary.data?.upcoming],
            [DollarSign, 'Online payments', money(summary.data?.revenue || 0)],
          ].map(([Icon, label, value]) => {
            const I = Icon as typeof Users;
            return (
              <div key={String(label)}>
                <I size={22} />
                <strong>{(value as string) || '0'}</strong>
                <span>{String(label)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="stat-grid">
          <div>
            <CalendarDays />
            <strong>{appointments.data?.filter((a) => a.status === 'booked').length || 0}</strong>
            <span>Booked appointments</span>
          </div>
          <div>
            <DollarSign />
            <strong>
              {money(
                appointments.data
                  ?.filter((a) => a.status === 'completed')
                  .reduce((s, a) => s + a.fee, 0) || 0,
              )}
            </strong>
            <span>Completed consultation value</span>
          </div>
        </div>
      )}
      <div className="tabs">
        {(admin ? ['appointments', 'doctors', 'patients'] : ['appointments', 'profile']).map(
          (t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ),
        )}
      </div>
      {action.error && <ErrorMessage message={action.error.message} />}{' '}
      {summary.error && <ErrorMessage message={summary.error.message} />}{' '}
      {tab === 'appointments' &&
        (appointments.isPending ? (
          <Loading />
        ) : appointments.error ? (
          <ErrorMessage message={appointments.error.message} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date & time (UTC)</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.data?.map((a) => (
                  <tr key={a.id}>
                    <td>{a.patient_name}</td>
                    <td>{a.doctor_name}</td>
                    <td>{new Date(a.slot).toLocaleString('en-US', { timeZone: 'UTC' })}</td>
                    <td>{money(a.fee)}</td>
                    <td>
                      <span className={'pill ' + a.status}>{a.status}</span>
                    </td>
                    <td>
                      {a.status === 'booked' && (
                        <div className="inline-actions">
                          <button
                            className="outline-button"
                            disabled={action.isPending || a.slot > new Date().toISOString()}
                            onClick={() => action.mutate({ id: a.id, action: 'complete' })}
                          >
                            Complete
                          </button>
                          <button
                            className="outline-button"
                            disabled={action.isPending}
                            onClick={() => action.mutate({ id: a.id, action: 'cancel' })}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!appointments.data?.length && <div className="empty">No appointments yet.</div>}
          </div>
        ))}
      {tab === 'doctors' && admin && (
        <>
          {editing ? (
            <DoctorForm doctor={editing} onDone={() => setEditing(null)} />
          ) : (
            <>
              <button className="button" onClick={() => setEditing(blank)}>
                <Plus size={18} />
                Add doctor
              </button>
              <div className="staff-doctors">
                {doctors.data?.map((d) => (
                  <article key={d.id}>
                    <img width="90" height="90" src={d.image} alt="" />
                    <div>
                      <h3>{d.name}</h3>
                      <p>{d.speciality}</p>
                      <span className="muted">
                        {d.available ? 'Available' : 'Unavailable'} · {money(d.fee)}
                      </span>
                    </div>
                    <button className="outline-button" onClick={() => setEditing(d)}>
                      Edit doctor
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {tab === 'patients' &&
        admin &&
        (patients.isPending ? (
          <Loading />
        ) : patients.error ? (
          <ErrorMessage message={patients.error.message} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {patients.data?.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{p.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      {tab === 'profile' &&
        !admin &&
        (ownDoctor.isPending ? (
          <Loading />
        ) : ownDoctor.error ? (
          <ErrorMessage message={ownDoctor.error.message} />
        ) : ownDoctor.data ? (
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              profile.mutate(new FormData(e.currentTarget));
            }}
          >
            <h2 className="span-2">Practice profile</h2>
            <label>
              Consultation fee
              <input
                name="fee"
                type="number"
                min="1"
                max="5000"
                defaultValue={ownDoctor.data.fee}
                required
              />
            </label>
            <label>
              Clinic address
              <input name="address" minLength={5} defaultValue={ownDoctor.data.address} required />
            </label>
            <label className="span-2">
              About
              <textarea
                name="about"
                minLength={30}
                maxLength={2000}
                defaultValue={ownDoctor.data.about}
                required
              />
            </label>
            <label className="check-label span-2">
              <input type="checkbox" name="available" defaultChecked={!!ownDoctor.data.available} />
              Accept new bookings
            </label>
            <div className="span-2">
              {profile.error && <ErrorMessage message={profile.error.message} />}{' '}
              {profile.isSuccess && <div className="feedback success">Practice profile saved.</div>}
              <button className="button" disabled={profile.isPending}>
                Save profile
              </button>
            </div>
          </form>
        ) : (
          <ErrorMessage message="Your doctor profile has not been linked. Contact the administrator." />
        ))}
    </div>
  );
}
