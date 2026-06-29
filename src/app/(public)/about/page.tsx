import type { Metadata } from 'next';
import { ContentPage } from '@/components/layout/content-page';

export const metadata: Metadata = {
  title: 'About — Move-Tick',
  description: 'Move-Tick is the event operating system by Move Beyond.',
};

export default function AboutPage() {
  return (
    <ContentPage
      title="About Move-Tick"
      subtitle="The event operating system by Move Beyond."
    >
      <p>
        <strong>Move-Tick</strong> is a modern ticketing and event-operations platform built
        for organizers who want a smooth experience from discovery to the door. Create events,
        sell or reserve tickets, invite guests, and run check-in with confidence.
      </p>
      <h2>What we do</h2>
      <p>
        From intimate meetups to large-scale conferences, Move-Tick handles registrations,
        paid ticketing, promo codes, QR check-in, spaces, redeemables, and live attendance —
        all in one place, with mobile tools for your gate staff.
      </p>
      <h2>Built by Move Beyond</h2>
      <p>
        Move-Tick is created and operated by Move Beyond. We&apos;re focused on giving
        organizers professional-grade tooling and giving attendees a fast, friendly experience.
      </p>
    </ContentPage>
  );
}
