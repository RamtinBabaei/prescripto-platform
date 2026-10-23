import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useUser, request } from '../api';
import { Loading, ErrorMessage } from '../components/Feedback';
export default function Account() {
  const { data: user, isPending } = useUser();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (form: FormData) => request('/me', 'PATCH', Object.fromEntries(form)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
  if (isPending) return <Loading />;
  if (!user)
    return (
      <div className="empty">
        <h1>Your care, in one place.</h1>
        <p>Sign in to view and update your profile.</p>
        <Link className="button" to="/login?next=/profile">
          Sign in
        </Link>
      </div>
    );
  return (
    <div className="page account-page">
      <div className="eyebrow">YOUR ACCOUNT</div>
      <h1>My profile</h1>
      <div className="profile-banner">
        <span className="avatar large">{user.name[0]}</span>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="pill">{user.role}</span>
        </div>
      </div>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(new FormData(e.currentTarget));
        }}
      >
        <label>
          Full name
          <input name="name" defaultValue={user.name} required minLength={2} maxLength={80} />
        </label>
        <label>
          Phone number
          <input name="phone" type="tel" defaultValue={user.phone} maxLength={30} />
        </label>
        <label className="span-2">
          Address
          <input name="address" defaultValue={user.address} maxLength={250} />
        </label>
        <label>
          Gender
          <select name="gender" defaultValue={user.gender}>
            <option value="">Select an option</option>
            {['Female', 'Male', 'Other', 'Prefer not to say'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Date of birth
          <input
            type="date"
            name="dob"
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={user.dob}
          />
        </label>
        <div className="span-2">
          {save.error && <ErrorMessage message={save.error.message} />}{' '}
          {save.isSuccess && (
            <div className="feedback success" role="status">
              Your profile has been updated.
            </div>
          )}
          <button className="button" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
