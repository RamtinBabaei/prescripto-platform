import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Search, CalendarDays, ShieldCheck, Check } from 'lucide-react';
import { useState } from 'react';
import { asset, useDoctors, specialties } from '../api';
import DoctorCard from '../components/DoctorCard';
import { Loading, ErrorMessage } from '../components/Feedback';
export default function Home() {
  const { data: doctors, isPending, error } = useDoctors();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow light">
            <span />
            YOUR HEALTH, A LITTLE SIMPLER
          </div>
          <h1>
            Book appointments
            <br />
            with trusted
            <br />
            <span>doctors.</span>
          </h1>
          <div className="hero-sub">
            <img src={asset('group_profiles.webp')} width="112" height="48" alt="" />
            <p>
              Find your specialist. Choose your time.
              <br />
              Great care is just a few clicks away.
            </p>
          </div>
          <Link className="button white" to="/doctors">
            Book an appointment <ArrowRight size={18} />
          </Link>
          <div className="hero-reassurance">
            <Check size={14} />
            Easy scheduling <span>•</span>
            <Check size={14} />
            No booking fees
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-ring" />
          <img
            className="hero-doctors"
            width="734"
            height="596"
            src={asset('header_img.webp')}
            alt="A team of welcoming medical professionals"
            fetchPriority="high"
          />
          <div className="floating-note">
            <span className="note-icon">
              <ShieldCheck size={23} />
            </span>
            <div>
              <strong>Care you can count on</strong>
              <span>Your next appointment, simplified</span>
            </div>
          </div>
        </div>
      </section>
      <form
        className="search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          navigate('/doctors?q=' + encodeURIComponent(search));
        }}
      >
        <Search size={21} />
        <label className="sr-only" htmlFor="home-search">
          Search doctors or specialties
        </label>
        <input
          id="home-search"
          placeholder="Search a doctor or specialty…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="search-detail">
          <CalendarDays size={18} />
          <span>Find your next available appointment</span>
        </div>
        <button className="button" type="submit">
          Find a doctor <ArrowUpRight size={17} />
        </button>
      </form>
      <section className="specialty-section">
        <div className="section-heading centered">
          <div className="eyebrow">THE RIGHT CARE FOR YOU</div>
          <h2>Find by speciality</h2>
          <p>
            From everyday checkups to specialist care,
            <br />
            find the right doctor for what you need.
          </p>
        </div>
        <div className="specialty-list">
          {specialties.map((s) => (
            <Link key={s} to={'/doctors?speciality=' + encodeURIComponent(s)}>
              <span className="specialty-art">
                <img width="80" height="80" src={asset(s.replace(' ', '_') + '.svg')} alt="" />
              </span>
              <span>{s}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="doctors-section">
        <div className="section-heading split">
          <div>
            <div className="eyebrow">MEET YOUR NEXT DOCTOR</div>
            <h2>Expert care. A human touch.</h2>
            <p>Browse our doctors and find someone who’s right for you.</p>
          </div>
          <Link className="text-link" to="/doctors">
            View all doctors <ArrowUpRight size={19} />
          </Link>
        </div>
        {isPending ? (
          <Loading />
        ) : error ? (
          <ErrorMessage message={error.message} />
        ) : (
          <div className="doctor-grid">
            {doctors?.slice(0, 8).map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        )}
        <Link className="button subtle more" to="/doctors">
          Explore all doctors <ArrowRight size={17} />
        </Link>
      </section>
      <section className="care-steps">
        <div>
          <div className="eyebrow">LESS WAITING. MORE LIVING.</div>
          <h2>
            Your next appointment,
            <br />
            in three simple steps.
          </h2>
        </div>
        <div className="steps-list">
          {[
            ['01', 'Find your doctor', 'Browse by specialty and get to know your provider.'],
            ['02', 'Pick a time', 'Choose an available slot that fits into your day.'],
            ['03', 'You’re all set', 'Manage your appointments from one simple place.'],
          ].map(([n, t, p]) => (
            <div key={n}>
              <span>{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="cta-banner">
        <div>
          <div className="eyebrow light">MAKE TIME FOR YOUR HEALTH</div>
          <h2>
            The right care.
            <br />
            At the right time.
          </h2>
          <Link className="button white" to="/login">
            Create your account <ArrowRight size={18} />
          </Link>
        </div>
        <img
          width="400"
          height="400"
          src={asset('appointment_img.webp')}
          loading="lazy"
          alt="Doctor ready to welcome a patient"
        />
      </section>
    </>
  );
}
