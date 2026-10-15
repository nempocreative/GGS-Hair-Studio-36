import { Banknote, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, LockKeyhole, Megaphone, Package, Plus, QrCode, ReceiptText, RefreshCw, Scissors, Search, Store, Trash2 } from "lucide-react";
import "./_group.css";

const money = (value: number) => `Rp${new Intl.NumberFormat("id-ID").format(value)}`;

/** Source-grounded snapshot of EmployeeCashierPage using local salon data. */
export function Current() {
  return (
    <main className="ggs-cashier-preview ggs-current">
      <header className="employee-cashier__heading">
        <div>
          <p className="employee-kicker">PEMBAYARAN RESEPSIONIS</p>
          <h1>Meja <em>kasir.</em></h1>
          <p>Pilih layanan atau produk, periksa total, lalu konfirmasi pembayaran.</p>
        </div>
        <span className="employee-cashier__secure-label"><LockKeyhole size={15} /> GGS Beauty</span>
      </header>
      <div className="cashier-workspace">
        <div className="cashier-workspace__bar">
          <div className="cashier-workspace__register">
            <span className="cashier-workspace__register-mark"><Store size={17} /></span>
            <div><span>REGISTER AKTIF</span><strong>GGS Beauty</strong></div>
            <small>Sesi berakhir 21.00 · Pajak 11%</small>
          </div>
          <button className="employee-cashier__lock-button"><LockKeyhole size={14} /> Kunci kasir</button>
        </div>
        <section className="cashier-announcements">
          <div className="cashier-announcements__heading"><span className="cashier-announcements__icon"><Megaphone size={17} /></span><div><span>INFO UNTUK REGISTER</span><h2>Pengumuman studio</h2></div><button>Perbarui</button></div>
          <div className="cashier-announcements__list">
            <article className="cashier-announcement cashier-announcement--info"><span className="cashier-announcement__marker" /><div className="cashier-announcement__copy"><div className="cashier-announcement__meta"><span>INFORMASI</span><small>Hari ini</small></div><h3>Perubahan jam operasional</h3><p>Penutupan layanan hari ini pukul 20.30.</p></div></article>
            <article className="cashier-announcement cashier-announcement--promo"><span className="cashier-announcement__marker" /><div className="cashier-announcement__copy"><div className="cashier-announcement__meta"><span>PROMO</span><small>1–30 Juni</small></div><h3>Perawatan rambut</h3><p>Voucher berlaku untuk layanan tertentu.</p></div></article>
          </div>
        </section>
        <section className="cashier-day-summary">
          <div className="cashier-day-summary__intro"><span>REKAP REGISTER</span><strong>Seluruh riwayat</strong></div>
          <div className="cashier-day-summary__metric"><span>Pemasukan bersih</span><strong>{money(2845000)}</strong></div>
          <div className="cashier-day-summary__metric"><span>Pembayaran selesai</span><strong>17</strong></div>
          <div className="cashier-day-summary__metric cashier-day-summary__metric--cancelled"><span>Dibatalkan</span><strong>1 · {money(125000)}</strong></div>
          <button className="cashier-day-summary__refresh" aria-label="Perbarui ringkasan"><RefreshCw size={15} /></button>
        </section>
        <section className="cashier-history">
          <div className="cashier-history__top">
            <div className="cashier-section-heading"><div><span>RIWAYAT REGISTER AKTIF</span><h2>Transaksi &amp; pemasukan</h2></div><span className="cashier-history__count">3 hasil</span></div>
            <div className="cashier-history__filters">
              <label className="cashier-history__search"><Search size={15} /><input placeholder="Struk, pelanggan, item…" /></label>
              <label className="cashier-history__filter">Status<select><option>Semua status</option></select></label>
              <label className="cashier-history__filter">Dari<input type="date" defaultValue="2025-06-12" /></label>
              <label className="cashier-history__filter">Sampai<input type="date" defaultValue="2025-06-12" /></label>
            </div>
          </div>
          <div className="cashier-method-recap"><span className="cashier-method-recap__label">METODE PEMBAYARAN</span><div className="cashier-method-recap__item"><span>Tunai <small>8 transaksi</small></span><strong>{money(1320000)}</strong></div><div className="cashier-method-recap__item"><span>QRIS <small>7 transaksi</small></span><strong>{money(1095000)}</strong></div><div className="cashier-method-recap__item"><span>Kartu <small>2 transaksi</small></span><strong>{money(430000)}</strong></div></div>
          <div className="cashier-history__table-wrap"><table className="cashier-history__table"><thead><tr><th>Struk / waktu</th><th>Pelanggan &amp; item</th><th>Metode</th><th>Status</th><th className="is-number">Jumlah</th><th>Detail</th></tr></thead><tbody>
            <tr><td><strong>GGS-250612-018</strong><span>12 Jun 2025, 14.42</span></td><td><strong>Nadia Putri</strong><span>Hair cut · Blow dry</span></td><td>Tunai</td><td><span className="cashier-history__status cashier-history__status--completed">Selesai</span></td><td className="is-number"><strong>{money(385000)}</strong></td><td><button className="cashier-history__detail">Detail</button></td></tr>
            <tr><td><strong>GGS-250612-017</strong><span>12 Jun 2025, 14.15</span></td><td><strong>Rafi Mahendra</strong><span>Classic cut</span></td><td>QRIS</td><td><span className="cashier-history__status cashier-history__status--completed">Selesai</span></td><td className="is-number"><strong>{money(175000)}</strong></td><td><button className="cashier-history__detail">Detail</button></td></tr>
            <tr><td><strong>GGS-250612-016</strong><span>12 Jun 2025, 13.58</span></td><td><strong>Pelanggan umum</strong><span>Shampoo daily</span></td><td>Kartu</td><td><span className="cashier-history__status cashier-history__status--cancelled">Dibatalkan</span></td><td className="is-number"><strong>{money(125000)}</strong></td><td><button className="cashier-history__detail">Detail</button></td></tr>
          </tbody></table></div>
          <footer className="cashier-history__pagination"><span>Halaman 1 dari 1 <small>· 3 transaksi</small></span><div><button aria-label="Halaman sebelumnya"><ChevronLeft size={16} /></button><button aria-label="Halaman berikutnya"><ChevronRight size={16} /></button></div></footer>
        </section>
        <div className="cashier-layout">
          <section className="cashier-catalog">
            <div className="cashier-section-heading"><div><span>LANGKAH 01</span><h2>Pilih item</h2></div><small>Harga katalog</small></div>
            <div className="cashier-catalog__tools"><div className="cashier-tabs"><button className="is-active"><Scissors size={15} /> Layanan</button><button><Package size={15} /> Produk</button></div><label className="cashier-search"><Search size={15} /><input placeholder="Cari item…" /></label></div>
            <div className="cashier-catalog__list">
              <article className="cashier-item"><div className="cashier-item__type"><Scissors size={16} /></div><div className="cashier-item__copy"><strong>Hair cut &amp; wash</strong><span>Hair styling · 60 menit</span></div><strong className="cashier-item__price">{money(275000)}</strong><button className="cashier-item__add"><Plus size={15} /> Tambah</button></article>
              <article className="cashier-item"><div className="cashier-item__type"><Scissors size={16} /></div><div className="cashier-item__copy"><strong>Blow dry</strong><span>Hair styling · 45 menit</span></div><strong className="cashier-item__price">{money(110000)}</strong><button className="cashier-item__add is-added"><CheckCircle2 size={14} /> 1</button></article>
              <article className="cashier-item"><div className="cashier-item__type"><Scissors size={16} /></div><div className="cashier-item__copy"><strong>Hair treatment</strong><span>Treatment · 75 menit</span></div><strong className="cashier-item__price">{money(320000)}</strong><button className="cashier-item__add"><Plus size={15} /> Tambah</button></article>
            </div>
          </section>
          <aside className="cashier-checkout">
            <div className="cashier-section-heading"><div><span>LANGKAH 02</span><h2>Rincian</h2></div><span className="cashier-checkout__count">2 item</span></div>
            <label className="cashier-field">Nama pelanggan <span>Opsional</span><input defaultValue="Nadia Putri" /></label>
            <div className="cashier-cart"><article className="cashier-cart-line"><div className="cashier-cart-line__copy"><strong>Hair cut &amp; wash</strong><span>{money(275000)} / item</span></div><div className="cashier-quantity"><button><Trash2 size={12} /></button><span>1</span><button><Plus size={13} /></button><button className="cashier-quantity__remove"><Trash2 size={13} /></button></div><strong className="cashier-cart-line__total">{money(275000)}</strong></article><article className="cashier-cart-line"><div className="cashier-cart-line__copy"><strong>Blow dry</strong><span>{money(110000)} / item</span></div><div className="cashier-quantity"><button>−</button><span>1</span><button><Plus size={13} /></button><button className="cashier-quantity__remove"><Trash2 size={13} /></button></div><strong className="cashier-cart-line__total">{money(110000)}</strong></article></div>
            <label className="cashier-field cashier-voucher-field">Voucher kasir <span>Opsional</span><select><option>Tanpa voucher</option><option>JUNECARE · 10%</option></select></label>
            <div className="cashier-breakdown"><div><span>Subtotal</span><strong>{money(385000)}</strong></div><div><span>Pajak (11%)</span><strong>{money(42350)}</strong></div><div className="cashier-breakdown__total"><span>Total pembayaran</span><strong>{money(427350)}</strong></div></div>
            <fieldset className="cashier-payment-method"><legend>Metode pembayaran</legend><button className="is-selected"><Banknote size={15} />Tunai</button><button><QrCode size={15} />QRIS</button><button><CreditCard size={15} />Kartu</button></fieldset>
            <label className="cashier-field cashier-field--amount">Uang diterima<input defaultValue="500000" /><span className="cashier-change"><span>Kembalian</span><strong>{money(72650)}</strong></span></label>
            <div className="cashier-amount-shortcuts"><button><span>Pembulatan Rp10 rb</span><strong>{money(430000)}</strong></button><button><span>Pembulatan Rp50 rb</span><strong>{money(450000)}</strong></button></div>
            <button className="cashier-submit">Konfirmasi pembayaran</button>
            <p className="cashier-checkout__footnote">Harga akhir dan stok dikonfirmasi oleh sistem.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
