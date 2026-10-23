import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { request, asset } from '../api';
import { ErrorMessage } from '../components/Feedback';
export default function Auth() {
  const [register, setRegister] = useState(true);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: (form: FormData) =>
      request('/auth/' + (register ? 'register' : 'login'), 'POST', Object.fromEntries(form)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
      const next = params.get('next');
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/appointments');
    },
  });
  return (
    <section className="auth-page">
      <div className="auth-art">
        <div className="eyebrow light">YOUR NEXT CHAPTER IN CARE</div>
        <h1>
          Good health starts
          <br />
          with a connection.
        </h1>
        <p>
          A doctor who listens. A time that works.
          <br />A little less to worry about.
        </p>
        <img width="500" height="500" src={asset('appointment_img.webp')} alt="Welcoming doctor" />
      </div>
      <div className="auth-form">
        <div className="eyebrow">WELCOME TO PRESCRIPTO</div>
        <h1>{register ? 'Make room for better care.' : 'Good to see you again.'}</h1>
        <p>
          {register
            ? 'Create an account to book and manage your appointments.'
            : 'Sign in to manage your care, all in one place.'}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate(new FormData(e.currentTarget));
          }}
        >
          {register && (
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Your full name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              required
              minLength={10}
              maxLength={128}
              placeholder="At least 10 characters"
            />
          </label>
          {submit.error && <ErrorMessage message={submit.error.message} />}
          <button className="button" disabled={submit.isPending}>
            {submit.isPending ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="switch-auth">
          {register ? 'Already have an account?' : 'New to Prescripto?'}{' '}
          <button
            onClick={() => {
              setRegister(!register);
              submit.reset();
            }}
          >
            {register ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        <div className="auth-note">
          <ShieldCheck size={17} />
          <p>
            Portfolio demo with fictional doctors. Please use sample information.{' '}
            <Link to="/privacy">Privacy details</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
