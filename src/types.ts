export interface Doctor {
  id: string;
  name: string;
  speciality: string;
  degree: string;
  experience: number;
  about: string;
  fee: number;
  image: string;
  address: string;
  available: number;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  phone: string;
  address: string;
  gender: string;
  dob: string;
}
export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  slot: string;
  fee: number;
  status: 'booked' | 'cancelled' | 'completed';
  payment: 'clinic' | 'pending' | 'paid';
  doctor_name: string;
  image: string;
  speciality: string;
  address: string;
  patient_name: string;
}
