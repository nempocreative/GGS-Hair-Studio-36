import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  House,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Scissors,
  Sparkles,
  X,
} from 'lucide-react';
import {
  getGetGgsPublicServicesQueryKey,
  getGetGgsSiteQueryKey,
  useCreateGgsAppointment,
  useGetGgsPublicServices,
  useGetGgsSite,
} from '@workspace/api-client-react';
import './homepage.css';

type BookingFields = {
  customerName: string;
  email: string;
  phone: string;
  serviceId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
};

const initialFields: BookingFields = {
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

const oldDefaultTagline = 'Rambutmu. Ceritamu. Versi terbaikmu.';
const oldDefaultIntroduction =
  'Studio rambut untuk potongan, warna, dan perawatan yang merayakan karakter unikmu.';

const naturalTagline =
  'Ceritakan apa yang kamu inginkan dan bagaimana kamu merawat rambut. Dari situ, kita pilih layanan yang pas.';
const naturalIntroduction =
  'GGS adalah studio rambut independen. Kami mulai dari obrolan tentang rambutmu, kebiasaanmu, dan waktu yang kamu punya.';

const mobileNavItems = [
  { label: 'Beranda', href: '#beranda', icon: House },
  { label: 'Layanan', href: '#layanan', icon: Scissors },
  { label: 'Buat janji', href: '#booking', icon: CalendarDays },
  { label: 'Kunjungi', href: '#kunjungi', icon: MapPin },
] as const;

const homeMenuItems = [
  {
    label: 'Cara kerja',
    description: 'Kenali tahapan sebelum janji.',
    href: '#cara-kerja',
    icon: MessageCircle,
  },
  {
    label: 'Layanan',
    description: 'Lihat pilihan dan harga.',
    href: '#layanan',
    icon: Scissors,
  },
  {
    label: 'Tentang GGS',
    description: 'Kenali pendekatan studio.',
    href: '#studio',
    icon: Sparkles,
  },
  {
    label: 'Kunjungi',
    description: 'Lihat informasi kunjungan.',
    href: '#kunjungi',
    icon: MapPin,
  },
] as const;

function App() {
  const siteQuery = useGetGgsSite({ query: { queryKey: getGetGgsSiteQueryKey() } });
  const servicesQuery = useGetGgsPublicServices({
    query: { queryKey: getGetGgsPublicServicesQueryKey() },
  });
  const appointment = useCreateGgsAppointment();
  const [fields, setFields] = useState<BookingFields>(initialFields);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeMobileSection, setActiveMobileSection] = useState('#beranda');

  const site = siteQuery.data;
  const services = useMemo(
    () => servicesQuery.data?.filter((service) => service.active) ?? [],
    [servicesQuery.data],
  );

  const tagline =
    site?.tagline && site.tagline.trim() !== oldDefaultTagline
      ? site.tagline
      : naturalTagline;
  const introduction =
    site?.introduction && site.introduction.trim() !== oldDefaultIntroduction
      ? site.introduction
      : naturalIntroduction;

  const setField = (name: keyof BookingFields, value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
  };

  const goToBooking = (serviceId?: number) => {
    if (serviceId) setField('serviceId', String(serviceId));
    setMenuOpen(false);
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(false);
    appointment.mutate(
      {
        data: {
          customerName: fields.customerName.trim(),
          email: fields.email.trim(),
          phone: fields.phone.trim(),
          serviceId: Number(fields.serviceId),
          appointmentDate: fields.appointmentDate,
          appointmentTime: fields.appointmentTime,
          notes: fields.notes.trim(),
        },
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setFields(initialFields);
        },
      },
    );
  };

  const navItems = [
    { label: 'Cara kerja', href: '#cara-kerja' },
    { label: 'Layanan', href: '#layanan' },
    { label: 'Studio', href: '#studio' },
    { label: 'Kunjungi', href: '#kunjungi' },
  ];

  const instagramHandle = site?.instagramHandle?.trim();
  const phone = site?.phone?.trim();

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    const sections = mobileNavItems
      .map(({ href }) => document.querySelector<HTMLElement>(href))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

        if (activeEntry) {
          setActiveMobileSection(`#${activeEntry.target.id}`);
        }
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.15, 0.35, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="clearer-page">
      <header className="clearer-header">
        <a href="#beranda" className="clearer-brand" aria-label="GGS, kembali ke beranda" data-testid="link-home">
          <span className="clearer-mark">G</span>
          <span>{site?.brandName || 'GGS'}</span>
        </a>

        <nav className="clearer-nav" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <a href={item.href} key={item.href} data-testid={`link-nav-${item.href.slice(1)}`}>
              {item.label}
            </a>
          ))}
        </nav>

        <button
          className="clearer-book-link"
          type="button"
          onClick={() => goToBooking()}
          data-testid="button-book-nav"
        >
          Buat janji <ArrowRight size={17} />
        </button>

        <button
          className="clearer-menu-button"
          type="button"
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          data-testid="button-menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {menuOpen && (
          <nav className="clearer-mobile-nav" aria-label="Navigasi ponsel">
            {navItems.map((item) => (
              <a
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
                data-testid={`link-mobile-${item.href.slice(1)}`}
              >
                {item.label}
              </a>
            ))}
            <button type="button" onClick={() => goToBooking()} data-testid="button-book-mobile">
              Buat janji <ArrowRight size={17} />
            </button>
          </nav>
        )}
      </header>

      <section className="clearer-hero" id="beranda">
        <div className="clearer-hero-copy">
          <p className="clearer-kicker">Studio rambut independen · Jakarta</p>
          <h1 data-testid="text-hero-title">
            Sebelum gunting,
            <br />
            kita <em>ngobrol.</em>
          </h1>
          <p className="clearer-lede" data-testid="text-hero-intro">
            {tagline}
          </p>
          <div className="clearer-hero-actions">
            <button
              className="clearer-primary-button"
              type="button"
              onClick={() => goToBooking()}
              data-testid="button-book-hero"
            >
              Pilih waktu kunjungan <ArrowRight size={18} />
            </button>
            <a className="clearer-text-link" href="#layanan" data-testid="link-explore-services">
              Lihat layanan <ArrowRight size={16} />
            </a>
          </div>
        </div>

        <div className="clearer-hero-image">
          <img
            src={site?.heroImageUrl || '/ggs-editorial.jpg'}
            alt="Potret gaya rambut editorial GGS"
            data-testid={site?.heroImageUrl ? 'img-hero-api' : 'img-hero-editorial'}
          />
        </div>
      </section>

      <nav className="clearer-home-menu" aria-label="Jelajahi GGS">
        <div className="clearer-home-menu-heading">
          <p className="clearer-kicker">Jelajahi GGS</p>
          <h2>Mau cari apa?</h2>
        </div>
        <div className="clearer-home-menu-grid">
          {homeMenuItems.map((item) => (
            <a
              className="clearer-home-menu-card"
              href={item.href}
              key={item.href}
              onClick={() => setActiveMobileSection(item.href)}
              data-testid={`link-home-menu-${item.href.slice(1)}`}
            >
              <span className="clearer-home-menu-card-top">
                <item.icon size={21} strokeWidth={1.8} aria-hidden="true" />
                <ArrowUpRight size={17} aria-hidden="true" />
              </span>
              <strong>{item.label}</strong>
              <span className="clearer-home-menu-description">{item.description}</span>
            </a>
          ))}
        </div>
      </nav>

      <section className="clearer-promise" id="cara-kerja">
        <div className="clearer-promise-intro">
          <p className="clearer-kicker">Cara kerja</p>
          <h2>Mulai dari kebutuhanmu.</h2>
          <p>
            Bawa foto kalau ada, atau ceritakan bagian rambut yang ingin diubah. Kalau belum
            yakin, kami bantu membahas pilihannya.
          </p>
        </div>
        <div className="clearer-steps">
          <article>
            <span>01</span>
            <h3>Ceritakan</h3>
            <p>Apa yang kamu suka, dan apa yang ingin terasa berbeda?</p>
          </article>
          <article>
            <span>02</span>
            <h3>Pilih bersama</h3>
            <p>Kami jelaskan pilihan, waktu, dan harga sebelum mulai.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Mulai</h3>
            <p>Kamu bisa bertanya atau mengubah arah selama proses.</p>
          </article>
        </div>
      </section>

      <section className="clearer-services" id="layanan">
        <div className="clearer-section-heading">
          <div>
            <p className="clearer-kicker">Layanan & harga</p>
            <h2>
              Pilih yang
              <br />
              kamu butuhkan.
            </h2>
          </div>
          <p>
            Lihat harga dan durasi di sini. Detailnya bisa dibahas lagi sebelum janji temu
            dikonfirmasi.
          </p>
        </div>

        {servicesQuery.isLoading ? (
          <div className="clearer-service-state" aria-label="Memuat layanan" data-testid="status-services-loading">
            <p>Memuat daftar layanan…</p>
          </div>
        ) : servicesQuery.isError ? (
          <div className="clearer-service-state" role="alert" data-testid="status-services-error">
            <p>Daftar layanan belum bisa dimuat.</p>
            <button
              className="clearer-retry"
              type="button"
              onClick={() => servicesQuery.refetch()}
              data-testid="button-retry-services"
            >
              Coba lagi
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="clearer-service-state" data-testid="status-services-empty">
            <p>Belum ada layanan yang bisa dipesan.</p>
          </div>
        ) : (
          <div className="clearer-service-list">
            {services.map((service, index) => (
              <article className="clearer-service-row" key={service.id} data-testid={`card-service-${service.id}`}>
                <span className="clearer-service-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="clearer-service-main">
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                </div>
                <div className="clearer-service-meta">
                  <span className="clearer-duration">
                    <Clock3 size={16} aria-hidden="true" /> {service.durationMinutes} menit
                  </span>
                  <strong>Rp{new Intl.NumberFormat('id-ID').format(service.price)}</strong>
                </div>
                <button
                  type="button"
                  className="clearer-service-action"
                  onClick={() => goToBooking(service.id)}
                  aria-label={`Pilih layanan ${service.name}`}
                  data-testid={`button-book-service-${service.id}`}
                >
                  Pilih <ArrowRight size={17} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="clearer-studio" id="studio">
        <div className="clearer-studio-copy">
          <p className="clearer-kicker">Tentang GGS</p>
          <h2>
            Jujur soal hasil.
            <br />
            <em>Fleksibel soal gaya.</em>
          </h2>
        </div>
        <div className="clearer-studio-copy clearer-studio-detail">
          <p data-testid="text-studio-description">{introduction}</p>
          <p>
            Kalau sebuah ide kurang cocok untuk kondisi rambutmu, kami akan menjelaskan alasannya
            dan mencari pilihan lain.
          </p>
          <button
            type="button"
            className="clearer-text-link clearer-inline-link"
            onClick={() => goToBooking()}
            data-testid="link-find-studio"
          >
            Mulai dengan konsultasi <ArrowRight size={17} />
          </button>
        </div>
      </section>

      <section className="clearer-booking" id="booking">
        <div className="clearer-booking-intro">
          <p className="clearer-kicker">Buat janji</p>
          <h2>
            Yuk, mulai
            <br />
            <em>dari ngobrol.</em>
          </h2>
          <p>
            Ajukan waktu yang kamu inginkan. Tim GGS akan menghubungi untuk membahas detail dan
            mengonfirmasi janji temu.
          </p>
          <div className="clearer-booking-note">
            Belum yakin soal layanan? Pilih yang paling mendekati. Kita bisa membahasnya lagi
            sebelum janji dikonfirmasi.
          </div>
        </div>

        <div className="clearer-form-wrap">
          {submitted && appointment.data ? (
            <div role="status" className="clearer-success" data-testid="status-booking-success">
              <span className="clearer-success-icon">
                <Check size={23} />
              </span>
              <h3>Terima kasih, {appointment.data.customerName}.</h3>
              <p>
                Permintaan untuk <strong>{appointment.data.serviceName}</strong> pada{' '}
                <strong>
                  {new Date(
                    `${appointment.data.appointmentDate}T${appointment.data.appointmentTime}`,
                  ).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                </strong>{' '}
                sudah kami terima. Tim kami akan menghubungimu untuk konfirmasi.
              </p>
              <p data-testid="text-appointment-reference">
                Nomor permintaan: <strong>#{appointment.data.id}</strong>
              </p>
              <button
                type="button"
                className="clearer-secondary-button"
                onClick={() => {
                  setSubmitted(false);
                  appointment.reset();
                }}
                data-testid="button-new-booking"
              >
                Buat permintaan lain
              </button>
            </div>
          ) : (
            <form
              className="clearer-form"
              onSubmit={handleSubmit}
              data-testid="form-appointment"
            >
              <div className="clearer-form-grid">
                <label>
                  Nama
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    value={fields.customerName}
                    onChange={(event) => setField('customerName', event.target.value)}
                    placeholder="Nama yang ingin kami panggil"
                    data-testid="input-customer-name"
                  />
                </label>
                <label>
                  Nomor telepon
                  <input
                    required
                    type="tel"
                    minLength={7}
                    maxLength={40}
                    autoComplete="tel"
                    value={fields.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    placeholder="Nomor yang bisa dihubungi"
                    data-testid="input-customer-phone"
                  />
                </label>
                <label className="clearer-form-wide">
                  Email
                  <input
                    required
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    value={fields.email}
                    onChange={(event) => setField('email', event.target.value)}
                    placeholder="nama@email.com"
                    data-testid="input-customer-email"
                  />
                </label>
                <label className="clearer-form-wide">
                  Layanan
                  <select
                    required
                    value={fields.serviceId}
                    onChange={(event) => setField('serviceId', event.target.value)}
                    disabled={services.length === 0}
                    data-testid="select-service"
                  >
                    <option value="" disabled>
                      {servicesQuery.isLoading
                        ? 'Memuat layanan…'
                        : services.length
                          ? 'Pilih layanan'
                          : 'Layanan belum tersedia'}
                    </option>
                    {services.map((service) => (
                      <option value={service.id} key={service.id}>
                        {service.name} · Rp{new Intl.NumberFormat('id-ID').format(service.price)} ·{' '}
                        {service.durationMinutes} menit
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tanggal yang diinginkan
                  <input
                    type="date"
                    min={today}
                    required
                    value={fields.appointmentDate}
                    onChange={(event) => setField('appointmentDate', event.target.value)}
                    data-testid="input-appointment-date"
                  />
                </label>
                <label>
                  Jam yang diinginkan
                  <input
                    type="time"
                    required
                    value={fields.appointmentTime}
                    onChange={(event) => setField('appointmentTime', event.target.value)}
                    data-testid="input-appointment-time"
                  />
                </label>
                <label className="clearer-form-wide">
                  Catatan <span>(opsional)</span>
                  <textarea
                    maxLength={600}
                    value={fields.notes}
                    onChange={(event) => setField('notes', event.target.value)}
                    placeholder="Ada yang ingin kami tahu tentang rambutmu?"
                    data-testid="input-appointment-notes"
                  />
                </label>
                {appointment.isError && (
                  <p role="alert" className="clearer-error" data-testid="status-booking-error">
                    Permintaan belum terkirim. Coba lagi; isianmu tetap tersimpan.
                  </p>
                )}
              </div>
              <div className="clearer-submit-row">
                <p>Waktu janji akan dikonfirmasi oleh tim GGS.</p>
                <button
                  type="submit"
                  className="clearer-primary-button"
                  disabled={appointment.isPending || services.length === 0}
                  data-testid="button-submit-appointment"
                >
                  {appointment.isPending ? 'Mengirim…' : 'Kirim permintaan'}
                  {!appointment.isPending && <ArrowRight size={17} />}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="clearer-visit" id="kunjungi">
        <div className="clearer-visit-heading">
          <div>
            <p className="clearer-kicker">Kunjungi GGS</p>
            <h2>Temukan studio.</h2>
          </div>
          <p>
            {site?.address
              ? 'Cek alamat dan jam studio sebelum datang.'
              : 'Ajukan janji lewat formulir. Tim GGS akan mengirimkan detail kunjungan saat mengonfirmasi.'}
          </p>
        </div>

        {siteQuery.isError ? (
          <div className="clearer-visit-empty" role="alert" data-testid="status-site-error">
            <p>Informasi studio belum bisa dimuat.</p>
            <button type="button" onClick={() => siteQuery.refetch()} data-testid="button-retry-site">
              Coba lagi
            </button>
          </div>
        ) : siteQuery.isLoading ? (
          <div className="clearer-visit-empty" data-testid="status-site-loading">
            <p>Memuat informasi studio…</p>
          </div>
        ) : site?.address || site?.openingHours || instagramHandle || phone ? (
          <div className="clearer-visit-grid">
            {site?.address && (
              <article className="clearer-visit-card" data-testid="card-location-address">
                <h3>
                  <MapPin size={17} aria-hidden="true" /> Alamat
                </h3>
                <p>{site.address}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="link-map"
                >
                  Buka peta <ArrowUpRight size={15} />
                </a>
              </article>
            )}
            {site?.openingHours && (
              <article className="clearer-visit-card" data-testid="card-location-hours">
                <h3>
                  <Clock3 size={17} aria-hidden="true" /> Jam buka
                </h3>
                <p className="whitespace-pre-line">{site.openingHours}</p>
              </article>
            )}
            {(instagramHandle || phone) && (
              <article className="clearer-visit-card" data-testid="card-location-connect">
                <h3>Hubungi</h3>
                {instagramHandle && (
                  <a
                    href={`https://instagram.com/${instagramHandle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="link-instagram"
                  >
                    <Instagram size={17} aria-hidden="true" /> {instagramHandle}
                  </a>
                )}
                {phone && (
                  <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} data-testid="link-phone">
                    <Phone size={16} aria-hidden="true" /> {phone}
                  </a>
                )}
              </article>
            )}
          </div>
        ) : (
          <div className="clearer-visit-empty" data-testid="text-contact-unavailable">
            <p>
              Alamat dan kontak belum tersedia di halaman ini. Ajukan janji; tim GGS akan
              menghubungimu untuk mengirimkan detailnya.
            </p>
          </div>
        )}
      </section>

      <footer className="clearer-footer" data-testid="footer-site">
        <a href="#beranda" className="clearer-brand" data-testid="link-footer-home">
          <span className="clearer-mark">G</span>
          <span>{site?.brandName || 'GGS'}</span>
        </a>
        <p>GGS Hair Studio</p>
        <a href="#beranda" className="clearer-back-top" data-testid="link-back-top">
          Kembali ke atas
        </a>
      </footer>

      <nav className="clearer-mobile-tabbar" aria-label="Navigasi utama ponsel">
        {mobileNavItems.map((item) => (
          <a
            href={item.href}
            key={item.href}
            aria-current={activeMobileSection === item.href ? 'location' : undefined}
            onClick={() => {
              setActiveMobileSection(item.href);
              setMenuOpen(false);
            }}
          >
            <item.icon size={19} strokeWidth={2} aria-hidden="true" />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </main>
  );
}

export default App;
