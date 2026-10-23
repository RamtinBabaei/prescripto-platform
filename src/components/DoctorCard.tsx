import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Doctor } from '../types';
import { money } from '../api';
export default function DoctorCard({ doctor: d }: { doctor: Doctor }) {
  return (
    <Link className="doctor-card" to={'/doctors/' + d.id}>
      <div className="doctor-image">
        <img width="300" height="300" loading="lazy" src={d.image} alt={d.name} />
        <span className="card-arrow">
          <ArrowUpRight size={19} />
        </span>
      </div>
      <div className="doctor-info">
        <span className={d.available ? 'availability' : 'availability off'}>
          <i />
          {d.available ? 'Available' : 'Currently unavailable'}
        </span>
        <h3>{d.name}</h3>
        <div className="card-meta">
          <span>{d.speciality}</span>
          <span>{money(d.fee)}</span>
        </div>
      </div>
    </Link>
  );
}
