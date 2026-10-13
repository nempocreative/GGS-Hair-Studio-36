import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import './_group.css';

const whyReasons = [
  {
    title: 'Keahlian mencukur dari Garut',
    description: 'GGS berangkat dari reputasi Garut dalam keahlian mencukur.',
  },
  {
    title: 'Konsultasi sebelum janji',
    description: 'Sampaikan gaya yang diinginkan. Tim GGS akan membahas pilihan dan detail sebelum janji dikonfirmasi.',
  },
  {
    title: 'Pelayanan dan kenyamanan',
    description: 'GGS mengutamakan pelayanan yang baik dan kenyamanan pelanggan selama kunjungan.',
  },
];

export function Current() {
  const [active, setActive] = useState(0);
  const preventPreviewNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault();

  return (
    <main className="why-demo">
      <section className="clearer-promise" aria-label="Mengapa memilih GGS">
        <div className="clearer-promise-intro">
          <h2>Mengapa memilih<br /><em>GGS?</em></h2>
          <p>GGS mengutamakan keahlian mencukur, pelayanan yang baik, dan kenyamanan pelanggan.</p>
          <div className="clearer-promise-actions">
            <a href="#services" className="clearer-text-link" onClick={preventPreviewNavigation}>
              Jelajahi layanan <ArrowRight size={16} />
            </a>
            <a href="#book" className="clearer-primary-button" onClick={preventPreviewNavigation}>
              Buat janji <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <div className="clearer-why-carousel" aria-label="Alasan memilih GGS" aria-roledescription="carousel">
          <article className="clearer-why-slide" key={whyReasons[active].title} aria-roledescription="slide">
            <h3>{whyReasons[active].title}</h3>
            <p className="clearer-why-description">{whyReasons[active].description}</p>
          </article>
          <div className="clearer-why-pagination" aria-label="Pilih alasan GGS">
            {whyReasons.map((reason, index) => (
              <button
                type="button"
                key={reason.title}
                aria-label={`Tampilkan: ${reason.title}`}
                aria-current={active === index ? 'true' : undefined}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
