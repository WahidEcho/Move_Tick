import type { Metadata } from 'next';
import { ContentPage } from '@/components/layout/content-page';

export const metadata: Metadata = {
  title: 'Privacy Policy — Move-Tick',
  description: 'How Move-Tick handles your data.',
};

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy" subtitle="Last updated: June 2026">
      <p>
        This Privacy Policy explains how Move Beyond (&quot;we&quot;, &quot;us&quot;) collects
        and uses information when you use Move-Tick.
      </p>
      <h2>Information we collect</h2>
      <p>
        Account details (name, email, phone), event and ticket activity, and payment status
        from our payment provider. We do not store full card details — payments are handled by
        our PCI-compliant payment processor.
      </p>
      <h2>How we use it</h2>
      <p>
        To create and deliver your tickets, send transactional emails (confirmations,
        invitations, password resets), enable check-in, and provide organizers with the
        information needed to run their events.
      </p>
      <h2>Sharing</h2>
      <p>
        When you register for an event, the organizer receives the registration details needed
        to admit you. We share data with service providers (hosting, email, payments) solely to
        operate the platform. We do not sell your personal data.
      </p>
      <h2>Your rights</h2>
      <p>
        You may access, correct, or request deletion of your personal data by contacting{' '}
        <a href="mailto:movetick@mbeg.org">movetick@mbeg.org</a>.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about privacy? Email{' '}
        <a href="mailto:movetick@mbeg.org">movetick@mbeg.org</a>.
      </p>
      <p>
        <em>
          This document is a general template and does not constitute legal advice. Please have
          it reviewed by qualified counsel before launch.
        </em>
      </p>
    </ContentPage>
  );
}
