import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, MapPin, ArrowRight, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useDoctors, useUser, request, money } from '../api';
import { Loading, ErrorMessage } from '../components/Feedback';
import DoctorCard from '../components/DoctorCard';
export default function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: doctors, isPending } = useDoctors();
  const { data: user } = useUser();
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const doctor = doctors?.find((d) => d.id === id);
  const available = useQuery({
    queryKey: ['slots', id],
    queryFn: () => request<{ timezone: string; slots: string[] }>(`/doctors/${id}/slots`),
    refetchInterval: 30000,
  });
  const days = [...new Set(available.data?.slots.map((s) => s.slice(0, 10)) || [])];
  const selectedDay = days.includes(day) ? day : days[0];
  useEffect(() => {
    setSlot('');
    setDay('');
  }, [id]);
  const booking = useMutation({
    mutationFn: () => request('/appointments', 'POST', { doctorId: id, slot }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['appointments'] });
      navigate('/appointments?booked=1');
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ['slots', id] });
      setSlot('');
    },
  });
  if (isPending) return <Loading />;
  if (!doctor)
    return (
      <div className="empty">
        <h1>Doctor not found</h1>
        <Link className="button" to="/doctors">
          Browse doctors
        </Link>
      </div>
    );
  return (
    <div className="page">
      <Link className="back-link" to="/doctors">
        <ArrowLeft size={16} />
        All doctors
      </Link>
      <section className="doctor-profile">
        <div className="profile-image">
          <img width="400" height="400" src={doctor.image} alt={doctor.name} />
        </div>
        <div className="profile-copy">
          <span className="eyebrow">YOUR CARE STARTS HERE</span>
          <h1>
            {doctor.name}
            <BadgeCheck size={28} fill="#5f6fff" color="white" />
          </h1>
          <div className="doctor-credentials">
            {doctor.degree} · {doctor.speciality}
            <span>
              {doctor.experience} {doctor.experience === 1 ? 'year' : 'years'} experience
            </span>
          </div>
          <h3>About</h3>
          <p>{doctor.about}</p>
          <p className="location">
            <MapPin size={17} />
            {doctor.address}
          </p>
          <div className="fee">
            Appointment fee <strong>{money(doctor.fee)}</strong>
            <span>No booking fees</span>
          </div>
        </div>
      </section>
      <section className="booking-panel">
        <div>
          <div className="eyebrow">MAKE A LITTLE TIME FOR YOU</div>
          <h2>Choose your appointment</h2>
          <p className="muted">
            <Clock size={15} />
            30-minute consultation · All times shown in UTC
          </p>
        </div>
        <div className="booking-slots">
          {available.isPending ? (
            <Loading />
          ) : available.error ? (
            <ErrorMessage message={available.error.message} />
          ) : !days.length ? (
            <div className="feedback">
              No appointments are currently available. Please check back soon.
            </div>
          ) : (
            <>
              <div className="day-options" role="group" aria-label="Choose a day">
                {days.map((d) => (
                  <button
                    key={d}
                    className={d === selectedDay ? 'active' : ''}
                    aria-pressed={d === selectedDay}
                    onClick={() => {
                      setDay(d);
                      setSlot('');
                    }}
                  >
                    <span>
                      {new Date(d + 'T12:00Z').toLocaleDateString('en-US', {
                        weekday: 'short',
                        timeZone: 'UTC',
                      })}
                    </span>
                    <strong>{d.slice(8)}</strong>
                    <span>
                      {new Date(d + 'T12:00Z').toLocaleDateString('en-US', {
                        month: 'short',
                        timeZone: 'UTC',
                      })}
                    </span>
                  </button>
                ))}
              </div>
              <div className="time-options" role="group" aria-label="Choose a time">
                {available.data?.slots
                  .filter((s) => s.startsWith(selectedDay))
                  .map((s) => (
                    <button
                      key={s}
                      aria-pressed={s === slot}
                      className={s === slot ? 'active' : ''}
                      onClick={() => setSlot(s)}
                    >
                      {new Date(s).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: 'UTC',
                      })}
                    </button>
                  ))}
              </div>
              {booking.error && <ErrorMessage message={booking.error.message} />}
              <button
                className="button"
                disabled={!slot || booking.isPending || (!!user && user.role !== 'patient')}
                onClick={() => {
                  if (!user) navigate('/login?next=' + encodeURIComponent('/doctors/' + id));
                  else booking.mutate();
                }}
              >
                {booking.isPending
                  ? 'Confirming…'
                  : user
                    ? 'Confirm appointment'
                    : 'Sign in to book'}
                <ArrowRight size={18} />
              </button>
              {user && user.role !== 'patient' && (
                <p className="muted">Please use a patient account to book.</p>
              )}
              <p className="booking-note">
                <ShieldCheck size={15} />
                Pay at the clinic. Cancel from your appointments page.
              </p>
            </>
          )}
        </div>
      </section>
      <section className="related">
        <h2>More specialists, same thoughtful care.</h2>
        <div className="doctor-grid">
          {doctors
            ?.filter((d) => d.speciality === doctor.speciality && d.id !== id)
            .slice(0, 4)
            .map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
        </div>
      </section>
    </div>
  );
}
