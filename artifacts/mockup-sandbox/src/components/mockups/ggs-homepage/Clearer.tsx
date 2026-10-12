import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, Check, Clock3, Menu, X } from 'lucide-react';
import './_group.css';
import './Clearer.css';

type BookingFields = {
  customerName: string;
  email: string;
  phone: string;
  serviceId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
};

const emptyFields: BookingFields = {
  customerName: '',
  email: '',
  phone: '',
  serviceId: '',
  appointmentDate: '',
  appointmentTime: '',
  notes: '',
};

const today = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const services = [
  { id: 1, name: 'Signature Cut', description: 'Potongan presisi yang dirancang untuk gaya dan rutinitasmu.', duration: 45, price: 250000 },
  { id: 2, name: 'Color Expression', description: 'Warna personal dengan konsultasi dan hasil yang berkilau.', duration: 120, price: 850000 },
  { id: 3, name: 'Care Ritual', description: 'Perawatan intensif untuk rambut yang lebih lembut dan sehat.', duration: 60, price: 420000 },
  { id: 4, name: 'Event Finish', description: 'Styling akhir untuk acara spesial dan momen pentingmu.', duration: 60, price: 500000 },
];

const money = (amount: number) => `Rp${new Intl.NumberFormat('id-ID').format(amount)}`;

export function Clearer() {
  const [fields, setFields] = useState<BookingFields>(emptyFields);
  const [menuOpen, setMenuOpen] = useState(false);
  const [booking, setBooking] = useState<{ name: string; service: string; date: string; time: string } | null>(null);

  const setField = (name: keyof BookingFields, value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
  };

  const goToBooking = (serviceId?: number) => {
    if (serviceId) setField('serviceId', String(serviceId));
    setMenuOpen(false);
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selected = services.find((service) => service.id === Number(fields.serviceId));
    if (!selected && fields.serviceId !== 'undecided') return;
    setBooking({
      name: fields.customerName.trim(),
      service: selected?.name ?? 'Konsultasi dulu',
      date: fields.appointmentDate,
      time: fields.appointmentTime,
    });
    setFields(emptyFields);
  };

  const navItems = [
    { label: 'Cara kami bekerja', href: '#cara-kerja' },
    { label: 'Layanan & harga', href: '#layanan' },
    { label: 'Studio', href: '#studio' },
  ];

  return (
    <main className="clearer-page">
      <header className="clearer-header">
        <a href="#beranda" className="clearer-brand" aria-label="GGS, kembali ke beranda">
          <span className="clearer-mark">G</span>
          <span>GGS <small>HAIR STUDIO</small></span>
        </a>
        <nav className="clearer-nav" aria-label="Navigasi utama">
          {navItems.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <button className="clearer-book-link" type="button" onClick={() => goToBooking()}>Buat janji <ArrowRight size={17} /></button>
        <button className="clearer-menu-button" type="button" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        {menuOpen && <nav className="clearer-mobile-nav" aria-label="Navigasi ponsel">
          {navItems.map((item) => <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
          <button type="button" onClick={() => goToBooking()}>Buat janji <ArrowRight size={17} /></button>
        </nav>}
      </header>

      <section className="clearer-hero" id="beranda">
        <div className="clearer-hero-copy">
          <p className="clearer-kicker">Studio rambut independen · Jakarta</p>
          <h1>Rambut yang<br />nyaman jadi <em>kamu.</em></h1>
          <p className="clearer-lede">Sebelum mulai, kita ngobrol dulu. Soal yang kamu suka, rutinitasmu, dan apa yang masuk akal untuk rambutmu.</p>
          <div className="clearer-hero-actions">
            <button className="clearer-primary-button" type="button" onClick={() => goToBooking()}>Pilih waktu konsultasi <ArrowRight size={18} /></button>
            <a className="clearer-text-link" href="#layanan">Lihat layanan <ArrowDown size={16} /></a>
          </div>
          <p className="clearer-hero-note">Tidak harus tahu mau potong apa. Kita cari tahu bareng.</p>
        </div>
        <div className="clearer-hero-image">
          <img src="/__mockup/images/ggs-editorial.jpg" alt="Potret rambut bob berwarna cokelat dengan highlight hangat" />
          <span className="clearer-image-caption">Potongan yang tetap terasa seperti milikmu.</span>
        </div>
      </section>

      <section className="clearer-promise" id="cara-kerja">
        <div className="clearer-promise-intro">
          <p className="clearer-kicker">Kita mulai dari percakapan</p>
          <h2>Kamu tidak perlu datang dengan jawaban.</h2>
          <p>Cukup ceritakan apa yang terasa kurang pas. Kami akan bantu memilah pilihan, tanpa menghakimi dan tanpa memaksa.</p>
        </div>
        <div className="clearer-steps">
          <article><span>01</span><h3>Ceritakan</h3><p>Bagaimana rambutmu sehari-hari? Apa yang ingin dipertahankan, dan apa yang ingin diubah?</p></article>
          <article><span>02</span><h3>Bahas pilihan</h3><p>Kami jelaskan perawatan, waktu, dan harga sebelum kamu memutuskan.</p></article>
          <article><span>03</span><h3>Kerjakan bersama</h3><p>Kamu bisa bertanya atau mengubah arah selama proses. Tidak perlu sungkan.</p></article>
        </div>
      </section>

      <section className="clearer-services" id="layanan">
        <div className="clearer-section-heading">
          <div><p className="clearer-kicker">Layanan & harga</p><h2>Pilih yang paling dekat<br />dengan kebutuhanmu.</h2></div>
          <p>Belum yakin? Tidak apa-apa. Pilih konsultasi lewat formulir, atau pilih layanan yang ingin kamu tanyakan.</p>
        </div>
        <div className="clearer-service-list">
          {services.map((service, index) => (
            <article className="clearer-service-row" key={service.id}>
              <span className="clearer-service-index">0{index + 1}</span>
              <div className="clearer-service-main">
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </div>
              <div className="clearer-service-meta">
                <span className="clearer-duration"><Clock3 size={16} /> {service.duration} menit</span>
                <strong>{money(service.price)}</strong>
              </div>
              <button type="button" className="clearer-service-action" onClick={() => goToBooking(service.id)} aria-label={`Tanyakan ${service.name}`}>Pilih <ArrowRight size={17} /></button>
            </article>
          ))}
        </div>
        <p className="clearer-price-note">Harga dan durasi tercantum sebagai panduan. Kami akan membahas detailnya sebelum layanan dimulai.</p>
      </section>

      <section className="clearer-studio" id="studio">
        <div className="clearer-studio-image">
          <img src="/__mockup/images/ggs-editorial.jpg" alt="Detail tekstur rambut dalam potret editorial GGS" />
        </div>
        <div className="clearer-studio-copy">
          <p className="clearer-kicker">Tentang GGS</p>
          <h2>Jujur soal hasil.<br /><em>Fleksibel soal gaya.</em></h2>
          <p>Rambut yang bagus bukan cuma bagus saat keluar dari studio. Kami ingin kamu tetap nyaman merawatnya setelah pulang, dengan cara yang sesuai waktumu.</p>
          <p>Kalau sebuah ide kurang cocok untuk kondisi rambutmu, kami akan bilang terus terang dan menawarkan pilihan lain.</p>
          <button type="button" className="clearer-text-link clearer-inline-link" onClick={() => goToBooking()}>Mulai dengan konsultasi <ArrowRight size={17} /></button>
        </div>
      </section>

      <section className="clearer-booking" id="booking">
        <div className="clearer-booking-intro">
          <p className="clearer-kicker">Langkah berikutnya</p>
          <h2>Yuk, mulai<br /><em>dari ngobrol.</em></h2>
          <p>Pilih waktu yang kamu inginkan dan ceritakan sedikit kebutuhanmu. Permintaan di halaman ini hanya simulasi mockup, belum terkirim ke studio.</p>
          <div className="clearer-booking-note">Belum tahu layanan yang cocok? Pilih “Belum yakin” — kita mulai dari situ.</div>
        </div>
        <div className="clearer-form-wrap">
          {booking ? (
            <div className="clearer-success" role="status">
              <span className="clearer-success-icon"><Check size={23} /></span>
              <h3>Terima kasih, {booking.name}.</h3>
              <p>Simulasi permintaanmu untuk <strong>{booking.service}</strong> pada <strong>{new Date(`${booking.date}T${booking.time}`).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</strong> sudah tercatat di halaman ini.</p>
              <p className="clearer-demo-note">Ini hanya konfirmasi lokal untuk mockup; tidak ada data yang dikirim ke GGS.</p>
              <button type="button" className="clearer-secondary-button" onClick={() => setBooking(null)}>Buat permintaan lain</button>
            </div>
          ) : (
            <form className="clearer-form" onSubmit={submitBooking}>
              <div className="clearer-form-grid">
                <label>Nama
                  <input required minLength={2} maxLength={120} autoComplete="name" value={fields.customerName} onChange={(event) => setField('customerName', event.target.value)} placeholder="Nama panggilanmu" />
                </label>
                <label>Nomor telepon
                  <input required type="tel" minLength={7} maxLength={40} autoComplete="tel" value={fields.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="Nomor yang bisa dihubungi" />
                </label>
                <label className="clearer-form-wide">Email
                  <input required type="email" maxLength={254} autoComplete="email" value={fields.email} onChange={(event) => setField('email', event.target.value)} placeholder="nama@email.com" />
                </label>
                <label className="clearer-form-wide">Layanan
                  <select required value={fields.serviceId} onChange={(event) => setField('serviceId', event.target.value)}>
                    <option value="" disabled>Pilih layanan atau belum yakin</option>
                    <option value="undecided">Belum yakin — ingin konsultasi dulu</option>
                    {services.map((service) => <option value={service.id} key={service.id}>{service.name} · {money(service.price)} · {service.duration} menit</option>)}
                  </select>
                </label>
                <label>Tanggal pilihan
                  <input type="date" min={today} required value={fields.appointmentDate} onChange={(event) => setField('appointmentDate', event.target.value)} />
                </label>
                <label>Jam pilihan
                  <input type="time" required value={fields.appointmentTime} onChange={(event) => setField('appointmentTime', event.target.value)} />
                </label>
                <label className="clearer-form-wide">Catatan <span>(opsional)</span>
                  <textarea maxLength={600} value={fields.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Ada yang ingin kami tahu tentang rambutmu?" />
                </label>
              </div>
              <div className="clearer-submit-row">
                <p>Waktu janji perlu dikonfirmasi oleh studio.</p>
                <button type="submit" className="clearer-primary-button">Lihat konfirmasi simulasi <ArrowRight size={17} /></button>
              </div>
            </form>
          )}
        </div>
      </section>

      <footer className="clearer-footer">
        <a href="#beranda" className="clearer-brand"><span className="clearer-mark">G</span><span>GGS <small>HAIR STUDIO</small></span></a>
        <p>Datang dengan cerita. Pulang dengan rambut yang terasa pas.</p>
        <a href="#beranda" className="clearer-back-top">Kembali ke atas ↑</a>
      </footer>
    </main>
  );
}
