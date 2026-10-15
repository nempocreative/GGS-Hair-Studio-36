import { Banknote, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, LockKeyhole, Megaphone, Package, Plus, QrCode, RefreshCw, Scissors, Search, Store, Trash2 } from "lucide-react";
import "./_group.css";

const money = (value: number) => `Rp${new Intl.NumberFormat("id-ID").format(value)}`;

/** Proposed cashier desk: same register content, with checkout as the primary task. */
export function Professional() {
  return (
    <main className="ggs-cashier-preview ggs-professional">
      <header className="employee-cashier__heading">
        <div><p className="employee-kicker">KASIR</p><h1>Meja kasir</h1></div>
      </header>
      <div className="cashier-workspace">
        <div className="cashier-workspace__bar">
          <div className="cashier-workspace__register"><span className="cashier-workspace__register-mark"><Store size={16} /></span><div><span>REGISTER</span><strong>GGS Beauty</strong></div><small>Sesi berakhir 21.00 · Pajak 11%</small></div>
          <button className="employee-cashier__lock-button"><LockKeyhole size={14} /> Kunci kasir</button>
        </div>
        <section className="cashier-announcements">
          <div className="cashier-announcements__heading"><span className="cashier-announcements__icon"><Megaphone size={15} /></span><div><span>CATATAN STUDIO</span><h2>Pengumuman</h2></div><button><RefreshCw size={13} /> Perbarui</button></div>
          <div className="cashier-announcements__list"><article className="cashier-announcement cashier-announcement--info"><span className="cashier-announcement__marker" /><div className="cashier-announcement__copy"><div className="cashier-announcement__meta"><span>INFO</span><small>Hari ini</small></div><h3>Penutupan layanan pukul 20.30</h3></div></article><article className="cashier-announcement cashier-announcement--promo"><span className="cashier-announcement__marker" /><div className="cashier-announcement__copy"><div className="cashier-announcement__meta"><span>PROMO</span><small>1–30 Jun</small></div><h3>Voucher June Care untuk layanan tertentu</h3></div></article></div>
        </section>
        <section className="cashier-day-summary" aria-label="Rekap pemasukan register">
          <div className="cashier-day-summary__intro"><span>REKAP REGISTER</span><strong>Seluruh riwayat</strong></div><div className="cashier-day-summary__metric"><span>Pemasukan bersih</span><strong>{money(2845000)}</strong></div><div className="cashier-day-summary__metric"><span>Pembayaran selesai</span><strong>17</strong></div><div className="cashier-day-summary__metric cashier-day-summary__metric--cancelled"><span>Dibatalkan</span><strong>1 · {money(125000)}</strong></div><button className="cashier-day-summary__refresh" aria-label="Perbarui ringkasan"><RefreshCw size={14} /></button>
        </section>
        <div className="cashier-layout">
          <section className="cashier-catalog" aria-label="Katalog layanan dan produk">
            <div className="cashier-section-heading"><div><span>KATALOG</span><h2>Pilih item</h2></div><small>Harga katalog</small></div>
            <div className="cashier-catalog__tools"><div className="cashier-tabs" role="tablist"><button className="is-active"><Scissors size={14} /> Layanan</button><button><Package size={14} /> Produk</button></div><label className="cashier-search"><Search size={14} /><input placeholder="Cari item…" /></label></div>
            <div className="cashier-catalog__list">
              <article className="cashier-item"><div className="cashier-item__type"><Scissors size={15} /></div><div className="cashier-item__copy"><strong>Hair cut &amp; wash</strong><span>Hair styling · 60 menit</span></div><strong className="cashier-item__price">{money(275000)}</strong><button className="cashier-item__add"><Plus size={14} /> Tambah</button></article>
              <article className="cashier-item"><div className="cashier-item__type"><Scissors size={15} /></div><div className="cashier-item__copy"><strong>Blow dry</strong><span>Hair styling · 45 menit</span></div><strong className="cashier-item__price">{money(110000)}</strong><button className="cashier-item__add is-added"><CheckCircle2 size={13} /> 1</button></article>
              <article className="cashier-item"><div className="cashier-item__type"><Scissors size={15} /></div><div className="cashier-item__copy"><strong>Hair treatment</strong><span>Treatment · 75 menit</span></div><strong className="cashier-item__price">{money(320000)}</strong><button className="cashier-item__add"><Plus size={14} /> Tambah</button></article>
              <article className="cashier-item"><div className="cashier-item__type"><Package size={15} /></div><div className="cashier-item__copy"><strong>Shampoo daily</strong><span>Hair care · Stok 12</span></div><strong className="cashier-item__price">{money(125000)}</strong><button className="cashier-item__add"><Plus size={14} /> Tambah</button></article>
            </div>
          </section>
          <aside className="cashier-checkout" aria-label="Rincian pembayaran">
            <div className="cashier-section-heading"><div><span>PEMBAYARAN</span><h2>Rincian pesanan</h2></div><span className="cashier-checkout__count">2 item</span></div>
            <label className="cashier-field">Nama pelanggan <span>Opsional</span><input defaultValue="Nadia Putri" /></label>
            <div className="cashier-cart"><article className="cashier-cart-line"><div className="cashier-cart-line__copy"><strong>Hair cut &amp; wash</strong><span>{money(275000)} / item</span></div><div className="cashier-quantity"><button aria-label="Kurangi Hair cut & wash">−</button><span>1</span><button aria-label="Tambah Hair cut & wash"><Plus size={12} /></button><button className="cashier-quantity__remove" aria-label="Hapus Hair cut & wash"><Trash2 size={12} /></button></div><strong className="cashier-cart-line__total">{money(275000)}</strong></article><article className="cashier-cart-line"><div className="cashier-cart-line__copy"><strong>Blow dry</strong><span>{money(110000)} / item</span></div><div className="cashier-quantity"><button aria-label="Kurangi Blow dry">−</button><span>1</span><button aria-label="Tambah Blow dry"><Plus size={12} /></button><button className="cashier-quantity__remove" aria-label="Hapus Blow dry"><Trash2 size={12} /></button></div><strong className="cashier-cart-line__total">{money(110000)}</strong></article></div>
            <label className="cashier-field cashier-voucher-field">Voucher kasir <span>Opsional</span><select><option>Tanpa voucher</option><option>JUNECARE · 10%</option></select></label>
            <div className="cashier-breakdown"><div><span>Subtotal</span><strong>{money(385000)}</strong></div><div><span>Pajak (11%)</span><strong>{money(42350)}</strong></div><div className="cashier-breakdown__total"><span>Total pembayaran</span><strong>{money(427350)}</strong></div></div>
            <fieldset className="cashier-payment-method"><legend>Metode pembayaran</legend><button className="is-selected"><Banknote size={14} />Tunai</button><button><QrCode size={14} />QRIS</button><button><CreditCard size={14} />Kartu</button></fieldset>
            <label className="cashier-field cashier-field--amount">Uang diterima<input defaultValue="500000" /><span className="cashier-change"><span>Kembalian</span><strong>{money(72650)}</strong></span></label>
            <div className="cashier-amount-shortcuts"><button><span>Uang pas</span><strong>{money(427350)}</strong></button><button><span>Pembulatan Rp10 rb</span><strong>{money(430000)}</strong></button></div>
            <button className="cashier-submit">Konfirmasi pembayaran <span aria-hidden="true">→</span></button>
            <p className="cashier-checkout__footnote">Harga dan stok dikonfirmasi saat pembayaran.</p>
          </aside>
        </div>
        <section className="cashier-history">
          <div className="cashier-history__top"><div className="cashier-section-heading"><div><span>CATATAN KASIR</span><h2>Riwayat transaksi</h2></div><span className="cashier-history__count">3 hasil</span></div><div className="cashier-history__filters"><label className="cashier-history__search"><Search size={14} /><input placeholder="Struk, pelanggan, item…" /></label><label className="cashier-history__filter">Status<select><option>Semua status</option></select></label><label className="cashier-history__filter">Dari<input type="date" defaultValue="2025-06-12" /></label><label className="cashier-history__filter">Sampai<input type="date" defaultValue="2025-06-12" /></label></div></div>
          <div className="cashier-method-recap"><span className="cashier-method-recap__label">METODE PEMBAYARAN</span><div className="cashier-method-recap__item"><span>Tunai <small>8 transaksi</small></span><strong>{money(1320000)}</strong></div><div className="cashier-method-recap__item"><span>QRIS <small>7 transaksi</small></span><strong>{money(1095000)}</strong></div><div className="cashier-method-recap__item"><span>Kartu <small>2 transaksi</small></span><strong>{money(430000)}</strong></div></div>
          <div className="cashier-history__table-wrap"><table className="cashier-history__table"><thead><tr><th>Struk / waktu</th><th>Pelanggan &amp; item</th><th>Metode</th><th>Status</th><th className="is-number">Jumlah</th><th>Detail</th></tr></thead><tbody><tr><td><strong>GGS-250612-018</strong><span>12 Jun 2025, 14.42</span></td><td><strong>Nadia Putri</strong><span>Hair cut · Blow dry</span></td><td>Tunai</td><td><span className="cashier-history__status cashier-history__status--completed">Selesai</span></td><td className="is-number"><strong>{money(385000)}</strong></td><td><button className="cashier-history__detail">Detail</button></td></tr><tr><td><strong>GGS-250612-017</strong><span>12 Jun 2025, 14.15</span></td><td><strong>Rafi Mahendra</strong><span>Classic cut</span></td><td>QRIS</td><td><span className="cashier-history__status cashier-history__status--completed">Selesai</span></td><td className="is-number"><strong>{money(175000)}</strong></td><td><button className="cashier-history__detail">Detail</button></td></tr><tr><td><strong>GGS-250612-016</strong><span>12 Jun 2025, 13.58</span></td><td><strong>Pelanggan umum</strong><span>Shampoo daily</span></td><td>Kartu</td><td><span className="cashier-history__status cashier-history__status--cancelled">Dibatalkan</span></td><td className="is-number"><strong>{money(125000)}</strong></td><td><button className="cashier-history__detail">Detail</button></td></tr></tbody></table></div>
          <footer className="cashier-history__pagination"><span>Halaman 1 dari 1 <small>· 3 transaksi</small></span><div><button aria-label="Halaman sebelumnya"><ChevronLeft size={15} /></button><button aria-label="Halaman berikutnya"><ChevronRight size={15} /></button></div></footer>
        </section>
      </div>
    </main>
  );
}
