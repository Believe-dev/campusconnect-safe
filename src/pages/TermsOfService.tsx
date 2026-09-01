const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-bold text-flora-ink sm:text-xl">{children}</h2>
);

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-flora-ink sm:text-3xl">Terms of Service</h1>
          <p className="mt-1 text-sm text-flora-muted">Last updated: August 27, 2026</p>
        </div>

        <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-8">
          <div className="space-y-6 text-sm leading-relaxed text-flora-ink sm:text-base">
            <p>
              Welcome to UniMarket. These Terms of Service ("Terms") govern your use of the UniMarket
              platform. By creating an account, you agree to these Terms.
            </p>
            <p>
              UniMarket is operated as a Sole Proprietorship registered in Nigeria (CAC Business Name
              Registration No. 8894632).
            </p>

            <div className="space-y-8 border-t border-flora-ink/10 pt-6">
              <section className="space-y-2">
                <SectionHeading>1. What UniMarket Is</SectionHeading>
                <p>
                  UniMarket is a <strong>marketplace facilitator</strong> — a platform that connects
                  student buyers and sellers across Nigerian universities.{" "}
                  <strong>
                    UniMarket is not the seller of any item listed on the platform, and is not a party to
                    the sale between a buyer and a seller.
                  </strong>{" "}
                  Sellers are independently responsible for the items they list, their accuracy,
                  condition, and legality.
                </p>
                <p>
                  Payments made through UniMarket are processed and held by{" "}
                  <strong>Anchor (getanchor.co)</strong>, our licensed payment infrastructure partner,
                  backed by CoreStep Microfinance Bank. UniMarket does not itself hold or have custody of
                  buyer or seller funds.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>2. Eligibility</SectionHeading>
                <p>
                  You must be <strong>18 years or older</strong> to create an account and use UniMarket,
                  as either a buyer or a seller.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>3. Account Registration</SectionHeading>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>You must provide accurate information when creating your account.</li>
                  <li>
                    Access to certain features may be limited to students of specific partnered
                    universities, and listings are shown based on your university affiliation.
                  </li>
                  <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <SectionHeading>4. Buying on UniMarket</SectionHeading>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    When you purchase an item, your payment is held in escrow through Anchor until you
                    confirm receipt of the item, or a dispute is resolved.
                  </li>
                  <li>
                    You have a limited protection window after an order is marked delivered to report an
                    issue (item not received, not as described, or otherwise problematic).
                  </li>
                  <li>
                    If a dispute is resolved in your favor, funds are returned to your UniMarket wallet,
                    from which you may withdraw to your bank account.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <SectionHeading>5. Escrow Protection</SectionHeading>
                <p>UniMarket's Escrow Protection works as follows:</p>
                <ol className="list-decimal space-y-1.5 pl-5">
                  <li>You pay for an item through the platform.</li>
                  <li>Your payment is held by Anchor, not released to the seller immediately.</li>
                  <li>
                    Once you confirm delivery, or the protection window expires without a dispute, funds
                    are released to the seller.
                  </li>
                  <li>
                    If you raise a dispute within the protection window, UniMarket reviews the case and,
                    where appropriate, funds are returned to you instead.
                  </li>
                </ol>
                <p>
                  This protection applies only to transactions completed through the UniMarket platform.
                  Off-platform arrangements are not covered.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>6. Selling on UniMarket</SectionHeading>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>
                    Sellers must complete identity verification (BVN/NIN, processed through Anchor) before
                    withdrawing any funds. You may list items and make sales before completing this
                    verification, but you will not be able to withdraw earnings until verification is
                    complete.
                  </li>
                  <li>
                    Sellers pay a registration fee to list items on the platform, currently ₦1,000/month,
                    processed through Anchor.
                  </li>
                  <li>
                    Sellers are solely responsible for the accuracy of their listings and for fulfilling
                    orders as described.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <SectionHeading>7. Prohibited Items and Conduct</SectionHeading>
                <p>You may not list, sell, or attempt to sell:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>Counterfeit, replica, or unauthorized branded goods</li>
                  <li>Stolen goods</li>
                  <li>Illegal items, or items prohibited under Nigerian law</li>
                  <li>Items misrepresenting their condition, authenticity, or origin</li>
                </ul>
                <p>
                  UniMarket reserves the right to remove listings, suspend accounts, and report suspected
                  illegal activity to relevant authorities.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>8. Disputes</SectionHeading>
                <p>
                  Disputes between buyers and sellers should first be raised through UniMarket's in-app
                  reporting system within the applicable protection window. UniMarket will review the
                  dispute based on the evidence provided and make a determination regarding fund release
                  or reversal.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>9. Fees</SectionHeading>
                <p>Current platform fees:</p>
                <ul className="list-disc space-y-1.5 pl-5">
                  <li>Seller registration fee: ₦1,000/month</li>
                </ul>
                <p>Fees may change with notice to users.</p>
              </section>

              <section className="space-y-2">
                <SectionHeading>10. Account Suspension and Termination</SectionHeading>
                <p>
                  We may suspend or terminate accounts that violate these Terms, including for listing
                  prohibited items, fraudulent activity, or repeated disputes indicating bad-faith conduct.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>11. Limitation of Liability</SectionHeading>
                <p>
                  As a marketplace facilitator, UniMarket is not liable for the quality, safety, legality,
                  or accuracy of items listed by sellers. Our responsibility is limited to operating the
                  platform and Escrow Protection process as described in these Terms.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>12. Changes to These Terms</SectionHeading>
                <p>
                  We may update these Terms from time to time. Existing users will be notified of material
                  changes and asked to accept the updated Terms to continue using the platform.
                </p>
              </section>

              <section className="space-y-2">
                <SectionHeading>13. Governing Law</SectionHeading>
                <p>These Terms are governed by the laws of the Federal Republic of Nigeria.</p>
              </section>

              <section className="space-y-2">
                <SectionHeading>14. Contact Us</SectionHeading>
                <p>
                  Questions about these Terms can be sent to{" "}
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

export default TermsOfService;
