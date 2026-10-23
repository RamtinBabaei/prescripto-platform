import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, MapPin, ArrowRight, Download } from 'lucide-react';
import { useUser, request, money } from '../api';
import type { Appointment } from '../types';
import { Loading, ErrorMessage } from '../components/Feedback';
function calendar(a: Appointment) {
  const dt = (s: string) => s.replace(/[-:]/g, '').replace('.000', '');
  const content = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Prescripto//Appointment//EN\r\nBEGIN:VEVENT\r\nUID:${a.id}@prescripto\r\nDTSTAMP:${dt(new Date().toISOString())}\r\nDTSTART:${dt(a.slot)}\r\nDTEND:${dt(new Date(new Date(a.slot).getTime() + 1800000).toISOString())}\r\nSUMMARY:Appointment with ${a.doctor_name.replace(/[\r\n,;]/g, ' ')}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'appointment.ics';
  link.click();
  URL.revokeObjectURL(url);
}
export default function Appointments() {
  const { data: user, isPending: pendingUser } = useUser();
  const [params] = useSearchParams();
  const [cancelId, setCancelId] = useState('');
  const [filter, setFilter] = useState('upcoming');
  const qc = useQueryClient();
  const appointments = useQuery({
    queryKey: ['appointments'],
    queryFn: () => request<Appointment[]>('/appointments'),
    enabled: !!user,
  });
  const config = useQuery({
    queryKey: ['config'],
    queryFn: () => request<{ onlinePayments: boolean }>('/config'),
  });
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      request<{ url?: string }>(`/appointments/${id}/${action}`, 'POST'),
    onSuccess: async (data) => {
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setCancelId('');
      await qc.invalidateQueries({ queryKey: ['appointments'] });
      await qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
  if (pendingUser) return <Loading />;
  if (!user)
    return (
      <div className="empty">
        <CalendarDays size={40} />
        <h1>Your appointments, all together.</h1>
        <p>Sign in to see and manage your appointments.</p>
        <Link className="button" to="/login?next=/appointments">
          Sign in
          <ArrowRight size={17} />
        </Link>
      </div>
    );
  const list = appointments.data?.filter(
    (a) =>
      filter === 'all' || (filter === 'upcoming' ? a.status === 'booked' : a.status !== 'booked'),
  );
  return (
    <div className="page">
      <div className="eyebrow">A LITTLE LESS TO KEEP TRACK OF</div>
      <h1>My appointments</h1>
      <p className="page-subtitle">Your next steps in care, all in one place.</p>
      {params.has('booked') && (
        <div className="feedback success" role="status">
          Your appointment is confirmed. We look forward to seeing you.
        </div>
      )}
      {params.get('payment') === 'success' && (
        <div className="feedback">
          Payment received by the payment provider. Confirmation will appear after secure
          verification.
        </div>
      )}
      <div className="tabs">
        {['upcoming', 'past', 'all'].map((v) => (
          <button key={v} className={v === filter ? 'active' : ''} onClick={() => setFilter(v)}>
            {v === 'past' ? 'Past & cancelled' : v}
          </button>
        ))}
      </div>
      {mutation.error && <ErrorMessage message={mutation.error.message} />}{' '}
      {appointments.isPending ? (
        <Loading />
      ) : appointments.error ? (
        <ErrorMessage message={appointments.error.message} />
      ) : !list?.length ? (
        <div className="empty">
          <CalendarDays size={38} />
          <h2>No appointments here yet</h2>
          <p>Make a little time for yourself. Find a doctor to get started.</p>
          <Link className="button" to="/doctors">
            Find a doctor
            <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="appointment-list">
          {list.map((a) => (
            <article className="appointment" key={a.id}>
              <img width="140" height="150" src={a.image} alt={a.doctor_name} />
              <div className="appointment-detail">
                <span className={'pill ' + a.status}>{a.status}</span>
                <h2>{a.doctor_name}</h2>
                <p>{a.speciality}</p>
                <p className="location">
                  <MapPin size={14} />
                  {a.address}
                </p>
                <strong>
                  {new Date(a.slot).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'UTC',
                  })}{' '}
                  UTC
                </strong>
                <p>
                  {money(a.fee)} ·{' '}
                  {a.payment === 'clinic'
                    ? 'Pay at clinic'
                    : a.payment === 'paid'
                      ? 'Paid online'
                      : 'Payment pending'}
                </p>
              </div>
              <div className="appointment-actions">
                {a.status === 'booked' && (
                  <>
                    <button className="button subtle" onClick={() => calendar(a)}>
                      <Download size={15} />
                      Add to calendar
                    </button>
                    {config.data?.onlinePayments && a.payment !== 'paid' && (
                      <button
                        className="button"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ id: a.id, action: 'checkout' })}
                      >
                        Pay online
                      </button>
                    )}
                    {cancelId === a.id ? (
                      <div className="cancel-confirm">
                        <p>Cancel this appointment?</p>
                        <button
                          className="button danger"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ id: a.id, action: 'cancel' })}
                        >
                          Yes, cancel
                        </button>
                        <button className="text-link" onClick={() => setCancelId('')}>
                          Keep appointment
                        </button>
                      </div>
                    ) : (
                      <button className="outline-button" onClick={() => setCancelId(a.id)}>
                        Cancel appointment
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
