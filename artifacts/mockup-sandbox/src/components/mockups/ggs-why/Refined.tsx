import { useState } from 'react';
import { ArrowRight, HeartHandshake, MessageCircle, Scissors } from 'lucide-react';
import './_group.css';
import './Refined.css';

const whyReasons = [
  {
    title: 'Keahlian mencukur dari Garut',
    description: 'GGS berangkat dari reputasi Garut dalam keahlian mencukur.',
    Icon: Scissors,
  },
  {
    title: 'Konsultasi sebelum janji',
    description: 'Sampaikan gaya yang diinginkan. Tim GGS akan membahas pilihan dan detail sebelum janji dikonfirmasi.',
    Icon: MessageCircle,
  },
  {
    title: 'Pelayanan dan kenyamanan',
    description: 'GGS mengutamakan pelayanan yang baik dan kenyamanan pelanggan selama kunjungan.',
    Icon: HeartHandshake,
  },
];

export function Refined() {
  const [active, setActive] = useState(0);

  return (
    <main className="ggs-why-refined">
      <section className="ggs-why-refined__layout" aria-label="Mengapa memilih GGS">
        <div className="ggs-why-refined__intro">
          <h2>Mengapa memilih<br /><em>GGS?</em></h2>
          <p className="ggs-why-refined__summary">
            GGS mengutamakan keahlian mencukur, pelayanan yang baik, dan kenyamanan pelanggan.
          </p>
          <div className="ggs-why-refined__actions">
            <a
              href="#services"
              className="ggs-why-refined__link"
              onClick={(event) => event.preventDefault()}
            >
              Jelajahi layanan <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a
              href="#book"
              className="ggs-why-refined__button"
              onClick={(event) => event.preventDefault()}
            >
              Buat janji <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="ggs-why-refined__reasons" role="group" aria-label="Alasan memilih GGS">
          {whyReasons.map(({ title, description, Icon }, index) => (
            <button
              className="ggs-why-refined__reason"
              type="button"
              key={title}
              aria-pressed={active === index}
              onClick={() => setActive(index)}
            >
              <span className="ggs-why-refined__icon" aria-hidden="true">
                <Icon size={19} strokeWidth={1.6} />
              </span>
              <span className="ggs-why-refined__reason-copy">
                <span className="ggs-why-refined__reason-title">{title}</span>
                <span className="ggs-why-refined__reason-description">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
