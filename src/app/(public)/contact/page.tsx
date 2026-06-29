import type { Metadata } from 'next';
import { ContentPage } from '@/components/layout/content-page';

export const metadata: Metadata = {
  title: 'Contact — Move-Tick',
  description: 'Get in touch with the Move-Tick team.',
};

export default function ContactPage() {
  return (
    <ContentPage
      title="Contact us"
      subtitle="We'd love to hear from you."
    >
      <p>
        Questions about an event, a ticket, or hosting on Move-Tick? Reach out and our team
        will get back to you.
      </p>
      <h2>Email</h2>
      <p>
        <a href="mailto:movetick@mbeg.org">movetick@mbeg.org</a>
      </p>
      <h2>For organizers</h2>
      <p>
        Want to host your event on Move-Tick?{' '}
        <a href="/apply-organizer">Apply to become an organizer</a> and we&apos;ll get you set up.
      </p>
    </ContentPage>
  );
}
