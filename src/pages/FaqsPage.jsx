import { useState } from 'react';

const FAQS = [
  {
    question: 'Where were Implingz minted?',
    answer: 'They were minted on Opensea as a Free mint on 7 August 2026.',
  },
  {
    question: 'Which blockchain are IMPLINGz on?',
    answer:
      'IMPLINGz are fully on-chain NFTs built on the Robinhood Chain.',
  },
  {
    question: 'How much does it cost to mint?',
    answer: 'Mints will always be free, only gas is required.',
  },
  {
    question: 'How many IMPLINGz are there?',
    answer: 'There are 2222 IMPLINGz in the collection.',
  },
  {
    question: 'Can I trade my IMPLINGz?',
    answer:
      'Yes. Once minted, IMPLINGz can be bought, sold, and traded on supported marketplaces such as OpenSea.',
  },
  {
    question: 'Will there be royalties?',
    answer:
      'Yes there will be royalties for holders coming soon!',
  },
  {
    question: 'Why should I own an IMPLING?',
    answer:
      "IMPLINGz are more than collectibles, they're designed to be your guides, with future utility, community-focused experiences, and an expanding on-chain ecosystem.",
  },
  {
    question: 'Where can I stay updated?',
    answer:
      'Follow the official IMPLINGz social channels and Discord for announcements, mint updates, and future releases.',
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item${open ? ' faq-item--open' : ''}`}>
      <button
        type="button"
        className="faq-item__trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="faq-item__question">{question}</span>
        <span className="faq-item__icon" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && <p className="faq-item__answer">{answer}</p>}
    </div>
  );
}

export default function FaqsPage() {
  return (
    <div className="faqs-page">
      <div className="faqs-page__inner">
        <h1 className="faqs-page__title">FAQs</h1>
        <div className="faqs-list">
          {FAQS.map((faq) => (
            <FaqItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
