// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DoctorCard from '../src/components/DoctorCard';
import Doctors from '../src/pages/Doctors';
import type { Doctor } from '../src/types';
const sample: Doctor = {
  id: 'doc1',
  name: 'Dr. Example',
  speciality: 'General physician',
  degree: 'MD',
  experience: 5,
  about: 'A thoughtful provider of comprehensive care.',
  fee: 50,
  image: '/assets/doc1.webp',
  address: 'Sample Clinic',
  available: 1,
};
vi.mock('../src/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/api')>();
  return {
    ...original,
    useDoctors: () => ({
      data: [
        sample,
        { ...sample, id: 'doc2', name: 'Dr. Skin', speciality: 'Dermatologist', fee: 30 },
      ],
      isPending: false,
      error: null,
    }),
  };
});
afterEach(cleanup);
describe('doctor discovery components', () => {
  it('renders accessible doctor details and navigable profile link', () => {
    render(
      <MemoryRouter>
        <DoctorCard doctor={sample} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Dr. Example' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Dr. Example' }).getAttribute('loading')).toBe('lazy');
    expect(screen.getByRole('link').getAttribute('href')).toBe('/doctors/doc1');
    expect(screen.getByText('$50')).toBeTruthy();
  });
  it('shows availability truthfully', () => {
    render(
      <MemoryRouter>
        <DoctorCard doctor={{ ...sample, available: 0 }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Currently unavailable')).toBeTruthy();
  });
  it('filters by speciality and displays the matching result', () => {
    render(
      <MemoryRouter>
        <Doctors />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dermatologist' }));
    expect(screen.queryByRole('heading', { name: 'Dr. Example' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Dr. Skin' })).toBeTruthy();
  });
  it('shows an actionable empty state for unmatched searches', () => {
    render(
      <MemoryRouter>
        <Doctors />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Search doctors' }), {
      target: { value: 'does-not-exist' },
    });
    expect(screen.getByRole('heading', { name: 'No doctors found' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('heading', { name: 'Dr. Example' })).toBeTruthy();
  });
});
