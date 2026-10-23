# Reference and feature review

The supplied project page (`https://greatstack.dev/p/prescripto-full-stack`) identifies a doctor appointment application and provides its design asset archive and demonstration video. Its visible page is sparse; requirements were reconstructed from the supplied assets, the preview image and the demonstrated three-role scheduling model. This is an independent TypeScript implementation, not a conversion of purchased source code.

## Implemented pages

Home, all doctors with speciality/search/availability/sort filters, doctor detail and booking, registration/sign-in, patient profile, appointment history and cancellation, about, contact, privacy, staff sign-in landing, doctor appointments/profile, administrator summary/doctors/patients/appointments, and a not-found page.

## Visual direction

Preserves the original Prescripto identity, indigo primary color, Outfit typography, supplied provider portraits and hero images, rounded doctor cards and speciality icons. Spacing, search discovery, responsive behavior, feedback and keyboard access are refined. Illustrative doctor information is fictional and identified as such.

## Implemented workflows

Patient registration, login/logout, persistent session, profile editing, doctor filtering, live availability, appointment creation with conflict handling, history, cancellation and calendar export. Doctors can update practice information/availability and view their assigned bookings. Staff can complete appointments after their scheduled start; admins can add/edit doctors, view patients, oversee appointments and see summary counts. Both admin and doctor access are server-authorized. Optional Stripe checkout/webhook integration is configuration gated and unverified against a real Stripe account.

## Explicit remaining limitations

No real payment credentials are present. The live demo runs pay at clinic; no money is collected. Stripe refunds, automated reminders, email verification and password recovery are not implemented. Staff accounts require operator provisioning. Provider portrait selection uses included optimized assets rather than accepting untrusted public uploads. Schedules are fixed UTC windows, not per-doctor recurring local schedules. These limits make the release a portfolio deployment, not a live medical service.

Supplied design imagery remains subject to its source terms. Confirm rights before commercial reuse. The Outfit font includes its OFL license.
