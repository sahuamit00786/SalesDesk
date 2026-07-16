import { LegalPageShell, LegalSection } from '@/features/leadflow-landing/components/LegalPageShell'

const CONTACT_EMAIL = 'sahuamit00786@gmail.com'
const UPDATED = 'July 10, 2026'

export function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      updated={UPDATED}
      description="How LeadNest collects, uses, stores, and protects your data, including Google user data accessed through Google APIs."
    >
      <p>
        This Privacy Policy explains how LeadNest (&ldquo;LeadNest&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, discloses, and safeguards your
        information when you use our customer relationship management (CRM) platform and related
        services (the &ldquo;Service&rdquo;). By using the Service, you agree to the practices
        described here.
      </p>

      <LegalSection heading="1. Information We Collect">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-zinc-800">Account information</strong> — name, email address,
            phone number, company, and password when you register.
          </li>
          <li>
            <strong className="text-zinc-800">CRM content</strong> — leads, contacts, deals,
            meetings, documents, emails, and other records you create or import into the Service.
          </li>
          <li>
            <strong className="text-zinc-800">Google user data</strong> — when you connect a Google
            account, we access data through Google APIs (Gmail, Google Calendar, and Google Meet) as
            described below.
          </li>
          <li>
            <strong className="text-zinc-800">Usage and device data</strong> — log data, IP address,
            browser type, and activity within the Service for security and diagnostics.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. Google User Data and API Services">
        <p>
          When you choose to connect your Google account, LeadNest requests access to specific
          scopes only to provide features you explicitly enable:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-zinc-800">Gmail</strong> — to sync, read, and send email from
            within your CRM inbox and to track email activity you initiate.
          </li>
          <li>
            <strong className="text-zinc-800">Google Calendar</strong> — to create, read, and manage
            calendar events and meetings linked to your CRM records.
          </li>
          <li>
            <strong className="text-zinc-800">Google Meet</strong> — to schedule meetings and, where
            you opt in, capture recordings and transcripts for AI summaries.
          </li>
        </ul>
        <p>
          LeadNest&rsquo;s use and transfer of information received from Google APIs adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-violet-700 underline underline-offset-2 hover:text-violet-600"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. We do not use Google user data for advertising,
          and we do not sell it. Google user data is used only to provide and improve user-facing
          features, is not transferred to others except as necessary to provide the Service, comply
          with law, or as part of a merger, and is not used for any purpose unrelated to the features
          you request. Humans do not read Google user data unless we have your consent for specific
          messages, it is necessary for security or to comply with law, or the data is aggregated and
          anonymized.
        </p>
      </LegalSection>

      <LegalSection heading="3. How We Use Information">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Provide, operate, and maintain the Service and its features.</li>
          <li>Authenticate users and secure accounts and workspaces.</li>
          <li>Sync email, calendar, and meeting data you have connected.</li>
          <li>Generate AI summaries and content only for features you activate.</li>
          <li>Send transactional notifications, reminders, and support communications.</li>
          <li>Detect, prevent, and address fraud, abuse, and technical issues.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. How We Share Information">
        <p>
          We do not sell your personal information. We share data only with: (a) members of your own
          workspace as required for collaboration; (b) service providers who process data on our
          behalf under confidentiality obligations (e.g., cloud hosting, email delivery, AI
          transcription); and (c) authorities when required by law. Any Google user data shared with
          providers is limited to what is necessary to deliver the feature you requested.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data Retention">
        <p>
          We retain your information for as long as your account is active or as needed to provide
          the Service. You may delete records at any time; deleted data is soft-retained briefly for
          recovery and then permanently removed. When you disconnect a Google account or delete your
          LeadNest account, associated Google user data is removed from our active systems.
        </p>
      </LegalSection>

      <LegalSection heading="6. Data Security">
        <p>
          We apply industry-standard safeguards including encryption in transit, access controls,
          role-based permissions, and workspace isolation. No method of transmission or storage is
          fully secure, but we work to protect your information and continuously improve our
          protections.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your Rights and Choices">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Access, correct, or export your personal data.</li>
          <li>Delete your account and associated data.</li>
          <li>
            Revoke Google access at any time via your{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-violet-700 underline underline-offset-2 hover:text-violet-600"
            >
              Google Account permissions
            </a>{' '}
            page.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="8. Children's Privacy">
        <p>
          The Service is not directed to individuals under 16, and we do not knowingly collect
          personal information from children.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected by
          updating the &ldquo;Last updated&rdquo; date above and, where appropriate, by additional
          notice within the Service.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact Us">
        <p>
          If you have questions about this Privacy Policy or our data practices, contact us at{' '}
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
