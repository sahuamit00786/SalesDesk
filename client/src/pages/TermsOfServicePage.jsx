import { Link } from 'react-router-dom'
import { LegalPageShell, LegalSection } from '@/features/leadflow-landing/components/LegalPageShell'

const CONTACT_EMAIL = 'sahuamit00786@gmail.com'
const UPDATED = 'July 10, 2026'

export function TermsOfServicePage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      updated={UPDATED}
      description="The terms and conditions that govern your use of the LeadNest CRM platform and related services."
    >
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the LeadNest
        CRM platform and related services (the &ldquo;Service&rdquo;) provided by LeadNest
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By creating an account or using
        the Service, you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <LegalSection heading="1. Eligibility and Accounts">
        <p>
          You must be at least 16 years old and able to form a binding contract to use the Service.
          You are responsible for maintaining the confidentiality of your account credentials and for
          all activity under your account. Notify us promptly of any unauthorized use.
        </p>
      </LegalSection>

      <LegalSection heading="2. Use of the Service">
        <p>You agree to use the Service only for lawful purposes. You will not:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Violate any applicable law, regulation, or third-party right.</li>
          <li>Send spam, unsolicited bulk email, or content that is unlawful or abusive.</li>
          <li>Attempt to gain unauthorized access to the Service or other accounts.</li>
          <li>Reverse engineer, disrupt, or overload the Service or its infrastructure.</li>
          <li>Use the Service to store or transmit malicious code.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Google Services and Third-Party Integrations">
        <p>
          The Service integrates with Google APIs (Gmail, Google Calendar, and Google Meet) and other
          third-party services that you choose to connect. Your use of those integrations is also
          subject to the applicable third-party terms, including Google&rsquo;s Terms of Service. Our
          handling of data obtained through these integrations is described in our{' '}
          <Link
            to="/privacy"
            className="font-medium text-violet-700 underline underline-offset-2 hover:text-violet-600"
          >
            Privacy Policy
          </Link>
          . You are responsible for ensuring you have the right to connect and process any data you
          bring into the Service.
        </p>
      </LegalSection>

      <LegalSection heading="4. Your Content">
        <p>
          You retain all rights to the leads, contacts, documents, emails, and other content you
          submit to the Service (&ldquo;Your Content&rdquo;). You grant us a limited license to host,
          process, and display Your Content solely to operate and provide the Service to you. You are
          solely responsible for the accuracy and legality of Your Content.
        </p>
      </LegalSection>

      <LegalSection heading="5. Subscriptions and Payment">
        <p>
          Paid plans, if applicable, are billed on the terms presented at purchase. Fees are
          non-refundable except where required by law. We may change pricing with reasonable prior
          notice. Failure to pay may result in suspension or termination of access.
        </p>
      </LegalSection>

      <LegalSection heading="6. Intellectual Property">
        <p>
          The Service, including its software, design, and trademarks, is owned by LeadNest and its
          licensors and is protected by intellectual property laws. These Terms do not grant you any
          right to our branding or technology except the limited right to use the Service as
          permitted.
        </p>
      </LegalSection>

      <LegalSection heading="7. Termination">
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or
          terminate your access if you breach these Terms or use the Service in a way that risks harm
          to us or others. Upon termination, your right to use the Service ends and your data is
          handled as described in our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection heading="8. Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
          warranties of any kind, whether express or implied, including merchantability, fitness for
          a particular purpose, and non-infringement. We do not warrant that the Service will be
          uninterrupted, error-free, or secure.
        </p>
      </LegalSection>

      <LegalSection heading="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, LeadNest will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss of data, revenue, or
          profits, arising out of or related to your use of the Service.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to These Terms">
        <p>
          We may update these Terms from time to time. Material changes take effect when we post the
          updated Terms and revise the &ldquo;Last updated&rdquo; date. Continued use of the Service
          after changes become effective constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact Us">
        <p>
          Questions about these Terms? Contact us at{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-violet-700 underline underline-offset-2 hover:text-violet-600"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
