const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-bold text-flora-ink sm:text-xl">{children}</h2>
);

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-flora-ink sm:text-3xl">Privacy Policy</h1>
          <p className="mt-1 text-sm text-flora-muted">Last updated: August 27, 2026</p>
        </div>

        <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-8">
          <div className="space-y-6 text-sm leading-relaxed text-flora-ink sm:text-base">
            <p>
              UniMarket ("we," "our," "us") operates a campus marketplace platform connecting student
              buyers and sellers across Nigerian universities. This policy explains what personal data we
              collect, why, and how you can control it.
            </p>
            <p>
              UniMarket is registered as a Sole Proprietorship in Nigeria (CAC Business Name Registration
              No. 8894632). We are committed to complying with the Nigeria Data Protection Act (NDPA) 2023.
            </p>

            <div className="space-y-8 border-t border-flora-ink/10 pt-6">
              <section className="space-y-3">
                <SectionHeading>1. Information We Collect</SectionHeading>

                <div className="space-y-1.5">
                  <p className="font-semibold text-flora-ink">Account information</p>
                  <ul className="list-disc space-y-1.5 pl-5">
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Phone number</li>
                    <li>University affiliation</li>
                    <li>Date of birth (used to confirm eligibility — see Section 6)</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <p className="font-semibold text-flora-ink">Location information</p>
                  <p>
                    Hostel/campus location, used only to arrange in-person meetups between buyers and
                    sellers. We do not collect or store full home addresses.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="font-semibold text-flora-ink">Transaction information</p>
                  <ul className="list-disc space-y-1.5 pl-5">
                    <li>Purchase and sale history</li>
                    <li>Order status and delivery confirmation records</li>
                    <li>Dispute records, if any</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <p className="font-semibold text-flora-ink">Seller-specific information</p>
                  <ul className="list-disc space-y-1.5 pl-5">
                    <li>
                      Bank/payment account details, submitted to and verified by our licensed payment
                      infrastructure partner, Anchor (getanchor.co / CoreStep Microfinance Bank), for the
                      purpose of receiving payments
                    </li>
                    <li>
                      Identity verification documents, submitted directly to Anchor for BVN/NIN
                      verification as part of Nigerian financial regulatory requirements. UniMarket does
                      not perform this verification itself.
                    </li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <p className="font-semibold text-flora-ink">Technical information</p>
                  <ul className="list-disc space-y-1.5 pl-5">
                    <li>IP address, collected automatically through standard web hosting infrastructure</li>
                    <li>Device and browser information, for security and fraud prevention</li>
                  </ul>
                </div>

                <p>
                  <strong>We do not collect:</strong> government-issued ID card images or numbers directly
                  on our platform (identity verification for sellers is handled through Anchor, as
                  described above).
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>2. Why We Collect This Information</SectionHeading>
                <p>We process your personal data to:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>Create and authenticate your account</li>
                  <li>
                    Facilitate transactions between buyers and sellers, including payment processing
                    through our licensed payment partner
                  </li>
                  <li>Verify seller identity and eligibility to receive payments (via Anchor)</li>
                  <li>Operate our Escrow Protection and dispute resolution process</li>
                  <li>Enable communication between buyers and sellers about listed items</li>
                  <li>Send transactional notifications (order updates, verification status, dispute updates)</li>
                  <li>Display relevant listings based on your university</li>
                  <li>
                    Maintain platform security and prevent fraud, counterfeit goods, and prohibited
                    transactions
                  </li>
                  <li>Comply with legal and regulatory obligations</li>
                </ul>
              </section>

              <section className="space-y-2">
                <SectionHeading>3. Who We Share Your Information With</SectionHeading>
                <p>We share limited personal data with:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    <strong>Anchor (getanchor.co)</strong> — our licensed payment infrastructure partner,
                    based in Nigeria. Anchor processes payments, holds funds in escrow, and performs
                    identity verification for sellers.
                  </li>
                  <li>
                    <strong>Supabase</strong> — our database provider, which stores account and transaction
                    data. Data is hosted in the European Union (Sweden).
                  </li>
                  <li>
                    <strong>Cloudflare</strong> — used for image storage (product photos) and website
                    infrastructure. Data is hosted within the European Union.
                  </li>
                  <li>
                    <strong>Resend</strong> — our email service provider, used to send transactional
                    emails. Infrastructure is hosted in the European Union (Ireland).
                  </li>
                </ul>
                <p>
                  Some of your data is processed outside Nigeria, in the European Union. These
                  jurisdictions are governed by the General Data Protection Regulation (GDPR), one of the
                  most comprehensive data protection frameworks in the world.
                </p>
                <p>We do not sell your personal data to third parties.</p>
              </section>

              <section className="space-y-2">
                <SectionHeading>4. Your Rights</SectionHeading>
                <p>Under the Nigeria Data Protection Act, you have the right to:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>Access the personal data we hold about you</li>
                  <li>Request correction of inaccurate data</li>
                  <li>
                    Request deletion of your data, subject to legal retention requirements (e.g.,
                    transaction records required for financial compliance)
                  </li>
                  <li>Object to certain processing of your data</li>
                  <li>Request a copy of your data in a portable format</li>
                </ul>
                <p>
                  To exercise any of these rights, contact us at{" "}
                  <a href="mailto:connectngcampus@gmail.com" className="font-medium text-flora-leaf underline">
                    connectngcampus@gmail.com
                  </a>
                  .
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>5. Data Security</SectionHeading>
                <p>
                  We implement reasonable technical and organizational measures to protect your data,
                  including encryption of data in transit (HTTPS/TLS) and at rest. Seller identity
                  verification is handled through Anchor's regulated infrastructure, not stored directly
                  by UniMarket.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>6. Age Eligibility</SectionHeading>
                <p>
                  UniMarket is available to users aged 18 and older. We do not knowingly collect personal
                  data from anyone under 18. If you believe a user under 18 has created an account, please
                  contact us at{" "}
                  <a href="mailto:connectngcampus@gmail.com" className="font-medium text-flora-leaf underline">
                    connectngcampus@gmail.com
                  </a>
                  .
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>7. Data Retention</SectionHeading>
                <p>
                  We retain your personal data for as long as your account is active, and afterward as
                  required to comply with legal, tax, and financial regulatory obligations (including
                  records related to payments processed through Anchor).
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>8. Changes to This Policy</SectionHeading>
                <p>
                  We may update this policy from time to time. If we make material changes, we will notify
                  existing users and request renewed acceptance before continuing to use the platform.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>9. Contact Us</SectionHeading>
                <p>
                  Questions about this policy or your data can be sent to{" "}
                  <a href="mailto:connectngcampus@gmail.com" className="font-medium text-flora-leaf underline">
                    connectngcampus@gmail.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
