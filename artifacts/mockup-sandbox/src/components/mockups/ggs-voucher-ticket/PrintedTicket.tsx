import './_group.css';
import './PrintedTicket.css';

const vouchers = [
  { name: 'Kenalan di GGS', value: '10%' },
  { name: 'Potong & Segar', value: 'Rp15.000' },
  { name: 'Ritual Perawatan', value: '15%' },
  { name: 'Cuci & Styling', value: '10%' },
];

export function PrintedTicket() {
  return (
    <main className="voucher-demo voucher-demo--printed">
      <section className="voucher-preview-section">
        <div className="voucher-preview-grid">
          {vouchers.map((voucher) => (
            <article className="sample-voucher-card printed-ticket" key={voucher.name}>
              <div className="sample-voucher-ticket-copy">
                <span className="printed-ticket-kicker">GGS HAIR STUDIO</span>
                <h4>{voucher.name}</h4>
                <strong>{voucher.value}</strong>
              </div>
              <span className="printed-ticket-stub" aria-hidden="true">
                <span className="printed-ticket-seal">G</span>
                <span className="printed-ticket-studio">SALON<br />GGS</span>
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
