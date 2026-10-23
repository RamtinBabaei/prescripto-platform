import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useDoctors, specialties } from '../api';
import DoctorCard from '../components/DoctorCard';
import { Loading, ErrorMessage } from '../components/Feedback';
export default function Doctors() {
  const { data, isPending, error } = useDoctors();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '',
    speciality = params.get('speciality') || '',
    sort = params.get('sort') || 'recommended';
  function update(k: string, v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  }
  const doctors = data
    ?.filter(
      (d) =>
        (!speciality || d.speciality === speciality) &&
        (!params.get('available') || d.available) &&
        `${d.name} ${d.speciality}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'fee' ? a.fee - b.fee : sort === 'experience' ? b.experience - a.experience : 0,
    );
  return (
    <div className="page">
      <div className="eyebrow">FIND YOUR SPECIALIST</div>
      <h1>Care that fits your life.</h1>
      <p className="page-subtitle">Explore our doctors and book a time that works for you.</p>
      <div className="directory-layout">
        <aside className="filters">
          <h3>
            <SlidersHorizontal size={17} /> Speciality
          </h3>
          {['All specialities', ...specialties].map((s, i) => (
            <button
              key={s}
              className={speciality === (i ? s : '') ? 'selected' : ''}
              onClick={() => update('speciality', i ? s : '')}
            >
              {s}
            </button>
          ))}
          <label className="check-label">
            <input
              type="checkbox"
              checked={!!params.get('available')}
              onChange={(e) => update('available', e.target.checked ? '1' : '')}
            />
            Available doctors only
          </label>
        </aside>
        <div>
          <div className="directory-toolbar">
            <div className="input-icon">
              <Search size={19} />
              <input
                aria-label="Search doctors"
                placeholder="Search by name or speciality"
                value={q}
                onChange={(e) => update('q', e.target.value)}
              />
            </div>
            <select
              aria-label="Sort doctors"
              value={sort}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="recommended">Recommended</option>
              <option value="fee">Lowest fee</option>
              <option value="experience">Most experienced</option>
            </select>
          </div>
          <p className="results-count">
            {doctors?.length || 0} doctors{' '}
            {speciality ? 'in ' + speciality : 'across all specialities'}
          </p>
          {isPending ? (
            <Loading />
          ) : error ? (
            <ErrorMessage message={error.message} />
          ) : doctors?.length ? (
            <div className="doctor-grid directory-grid">
              {doctors.map((d) => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <Search size={32} />
              <h2>No doctors found</h2>
              <p>Try a different name or speciality.</p>
              <button className="button" onClick={() => setParams({})}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
