import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Heart, CalendarCheck } from 'lucide-react';
import { asset } from '../api';
export default function Information({ type }: { type: 'about' | 'contact' | 'privacy' }) {
  if (type === 'privacy')
    return (
      <article className="page prose">
        <div className="eyebrow">CLEAR BY DESIGN</div>
        <h1>Privacy & demo information</h1>
        <p>
          This public portfolio application demonstrates healthcare scheduling. Doctors, clinic
          addresses and services are fictional. It does not provide medical advice or real
          appointments.
        </p>
        <h2>What we store</h2>
        <p>
          Account name, email, a one-way password hash, optional profile fields and appointment
          records are stored in the application database. Please use sample details. No medical
          records or symptoms are requested.
        </p>
        <h2>Sessions & access</h2>
        <p>
          A secure, HTTP-only cookie keeps you signed in for seven days. Patients can access their
          own profiles and appointments. Clinic staff access only the records their role permits.
        </p>
        <h2>Payments</h2>
        <p>
          The public demo uses pay at clinic. Optional online checkout requires the operator’s
          Stripe configuration. Card information is entered only on Stripe’s hosted checkout page,
          never stored here.
        </p>
        <h2>Contact</h2>
        <p>
          For project or data requests, contact{' '}
          <a href="mailto:ramtin.babae011@gmail.com">Ramtin Babaei</a>. This demo is not an
          emergency or patient support service.
        </p>
      </article>
    );
  if (type === 'contact')
    return (
      <div className="page">
        <div className="section-heading centered">
          <div className="eyebrow">WE’RE HERE TO HELP</div>
          <h1>Let’s get you connected.</h1>
          <p>Questions about the platform? We’d love to hear from you.</p>
        </div>
        <section className="info-layout">
          <img
            width="600"
            height="600"
            src={asset('contact_image.webp')}
            alt="A welcoming clinic space"
          />
          <div>
            <span className="eyebrow">PROJECT & PLATFORM SUPPORT</span>
            <h2>A conversation is a good place to start.</h2>
            <p>
              This is a portfolio demonstration of a clinic booking platform. For questions about
              the project or a collaboration, reach out directly.
            </p>
            <a className="button" href="mailto:ramtin.babae011@gmail.com">
              Email Ramtin <ArrowRight size={18} />
            </a>
            <h3>Already have an account?</h3>
            <p>You can view and manage your bookings from your appointments page.</p>
            <Link className="text-link" to="/appointments">
              Manage appointments <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </div>
    );
  return (
    <div className="page">
      <div className="section-heading centered">
        <div className="eyebrow">A BETTER WAY TO CONNECT</div>
        <h1>Care starts with people.</h1>
        <p>We make the space between finding a doctor and seeing one a little simpler.</p>
      </div>
      <section className="info-layout">
        <img
          width="600"
          height="600"
          src={asset('about_image.webp')}
          alt="Medical team working together"
        />
        <div>
          <span className="eyebrow">ABOUT PRESCRIPTO</span>
          <h2>
            Less complexity.
            <br />
            More connection.
          </h2>
          <p>
            Finding the right specialist should feel clear and straightforward. Prescripto brings
            doctor discovery, availability, and appointment management together in one thoughtful
            experience.
          </p>
          <p>
            Browse by speciality, get to know your doctor, and choose a time that works for you.
            Your appointments are always a click away.
          </p>
          <Link className="button" to="/doctors">
            Find your doctor
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <div className="value-grid">
        {[
          [
            Clock,
            'Your time matters',
            'Choose an available appointment without the back and forth.',
          ],
          [Heart, 'Care made personal', 'Find the specialist that fits your needs.'],
          [
            CalendarCheck,
            'Clarity at every step',
            'Know your appointment time, fee and status before you arrive.',
          ],
        ].map(([Icon, t, p]) => {
          const I = Icon as typeof Clock;
          return (
            <article key={String(t)}>
              <I size={26} />
              <h3>{String(t)}</h3>
              <p>{String(p)}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
