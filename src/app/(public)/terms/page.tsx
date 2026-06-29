import type { Metadata } from 'next';
import { ContentPage } from '@/components/layout/content-page';

export const metadata: Metadata = {
  title: 'Terms of Service — Move-Tick',
  description: 'The terms governing your use of Move-Tick.',
};

export default function TermsPage() {
  return (
    <ContentPage title="Terms of Service" subtitle="Last updated: June 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of Move-Tick,
        operated by Move Beyond (&quot;we&quot;, &quot;us&quot;). By creating an account,
        purchasing a ticket, or hosting an event, you agree to these Terms.
      </p>
      <h2>1. Accounts</h2>
      <p>
        You are responsible for the activity on your account and for keeping your credentials
        secure. You must provide accurate information and be at least the age of majority in
        your jurisdiction.
      </p>
      <h2>2. Tickets &amp; payments</h2>
      <p>
        Ticket sales are processed by our payment provider. Prices, fees, and availability are
        set by event organizers. Unless stated otherwise by the organizer, all sales are final.
        Refunds, where offered, are handled per the organizer&apos;s policy.
      </p>
      <h2>3. Organizers</h2>
      <p>
        Organizers are responsible for their events, the accuracy of event information, and
        compliance with applicable laws. Move Beyond is a platform provider and is not the
        organizer of events listed on Move-Tick unless explicitly stated.
      </p>
      <h2>4. Acceptable use</h2>
      <p>
        You agree not to misuse the platform, attempt to bypass security, resell tickets in
        violation of an organizer&apos;s rules, or use Move-Tick for unlawful purposes.
      </p>
      <h2>5. Liability</h2>
      <p>
        Move-Tick is provided &quot;as is.&quot; To the maximum extent permitted by law, Move
        Beyond is not liable for indirect or consequential damages arising from your use of the
        platform or attendance at any event.
      </p>
      <h2>6. Contact</h2>
      <p>
        Questions about these Terms? Email{' '}
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
