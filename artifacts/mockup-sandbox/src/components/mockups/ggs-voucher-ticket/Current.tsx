import './_group.css';

const vouchers = [
  { name: 'Kenalan di GGS', value: '10%' },
  { name: 'Potong & Segar', value: 'Rp15.000' },
  { name: 'Ritual Perawatan', value: '15%' },
  { name: 'Cuci & Styling', value: '10%' },
];

export function Current() {
  return (
    <main className="voucher-demo voucher-demo--current">
      <section className="voucher-preview-section">
        <div className="voucher-preview-grid">
          {vouchers.map((voucher) => (
            <article className="sample-voucher-card" key={voucher.name}>
              <div className="sample-voucher-ticket-copy">
                <h4>{voucher.name}</h4>
                <strong>{voucher.value}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
