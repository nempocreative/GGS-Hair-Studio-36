import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Compass,
  Gift,
  House,
  Instagram,
  MapPin,
  Menu,
  Phone,
  Scissors,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import {
  getGetGgsPublicServicesQueryKey,
  getGetGgsSiteQueryKey,
  useCreateGgsAppointment,
  useGetGgsPublicServices,
  useGetGgsSite,
} from '@workspace/api-client-react';
import type { GgsService, GgsSiteContent } from '@workspace/api-client-react';
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

const routes = [
  { href: '/', label: 'Home', icon: House },
  { href: '/services', label: 'Services', icon: Scissors },
  { href: '/style-gallery', label: 'Style Gallery', icon: Sparkles },
  { href: '/offers-membership', label: 'Offers & Membership', icon: Gift },
  { href: '/branches', label: 'Our Branches', icon: Compass },
  { href: '/my-ggs', label: 'My GGS', icon: UserRound },
] as const;

const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
const money = (amount: number) => `Rp${new Intl.NumberFormat('id-ID').format(amount)}`;

function App() {
  const siteQuery = useGetGgsSite({ query: { queryKey: getGetGgsSiteQueryKey() } });
  const servicesQuery = useGetGgsPublicServices({
    query: { queryKey: getGetGgsPublicServicesQueryKey() },
  });
  const appointment = useCreateGgsAppointment();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fields, setFields] = useState<BookingFields>(initialFields);
  const [submitted, setSubmitted] = useState(false);
  const services = useMemo(
    () => servicesQuery.data?.filter((service) => service.active) ?? [],
    [servicesQuery.data],
  );
  const site = siteQuery.data;

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  const updateField = (key: keyof BookingFields, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

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

  const openBooking = (serviceId?: number) => {
    if (serviceId) updateField('serviceId', String(serviceId));
  };

  const common = {
    services,
    servicesQuery,
    siteQuery,
    site,
    openBooking,
  };

  return (
    <main className="clearer-page">
      <header className="clearer-header">
        <Link href="/" className="clearer-brand" aria-label="GGS, ke beranda" data-testid="link-home">
          <span className="clearer-mark">G</span>
          <span className="brand-wordmark">
            {site?.brandName?.trim() || 'GGS'}
            <small>HAIR STUDIO</small>
          </span>
        </Link>
        <nav className="clearer-nav" aria-label="Navigasi utama">
          {routes.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              aria-current={location === item.href ? 'page' : undefined}
              data-testid={`link-nav-${item.href === '/' ? 'home' : item.href.slice(1)}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/book" className="clearer-book-link" data-testid="link-book-header">
          Book Appointment <ArrowRight size={17} />
        </Link>
        <button
          className="clearer-menu-button"
          type="button"
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          data-testid="button-menu"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        {menuOpen && (
          <nav className="clearer-mobile-nav" aria-label="Navigasi ponsel">
            {routes.map((item) => (
              <Link href={item.href} key={item.href} data-testid={`link-mobile-${item.href.slice(1) || 'home'}`}>
                {item.label} <ArrowUpRight size={15} />
              </Link>
            ))}
            <Link href="/book" className="mobile-book" data-testid="link-mobile-book">
              Book Appointment <ArrowRight size={16} />
            </Link>
          </nav>
        )}
      </header>

      <Switch>
        <Route path="/">
          <HomePage {...common} />
        </Route>
        <Route path="/services">
          <ServicesPage {...common} />
        </Route>
        <Route path="/book">
          <BookingPage
            {...common}
            fields={fields}
            updateField={updateField}
            handleSubmit={handleSubmit}
            appointment={appointment}
            submitted={submitted}
            setSubmitted={setSubmitted}
            setFields={setFields}
          />
        </Route>
        <Route path="/style-gallery">
          <GalleryPage />
        </Route>
        <Route path="/offers-membership">
          <OffersPage />
        </Route>
        <Route path="/branches">
          <BranchesPage {...common} />
        </Route>
        <Route path="/my-ggs">
          <MyGgsPage />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>

      <footer className="clearer-footer">
        <p>© {new Date().getFullYear()} {site?.brandName?.trim() || 'GGS Hair Studio'}. Studio rambut, dimulai dari percakapan.</p>
        <Link href="/book" className="clearer-back-top" data-testid="link-footer-book">Ajukan janji <ArrowRight size={15} /></Link>
      </footer>
      <nav className="clearer-mobile-tabbar" aria-label="Navigasi bawah">
        {[
            { href: '/', label: 'Home', icon: House },
            { href: '/services', label: 'Services', icon: Scissors },
            { href: '/book', label: 'Booking', icon: CalendarDays },
          { href: '/my-ggs', label: 'My GGS', icon: UserRound },
        ].map((item) => (
          <Link
            href={item.href}
            key={item.href}
            aria-current={location === item.href ? 'page' : undefined}
            data-testid={`link-tab-${item.href.slice(1) || 'home'}`}
          >
            <item.icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}

type SharedProps = {
  services: GgsService[];
  servicesQuery: ReturnType<typeof useGetGgsPublicServices>;
  siteQuery: ReturnType<typeof useGetGgsSite>;
  site: GgsSiteContent | undefined;
  openBooking: (serviceId?: number) => void;
};

const homeShortcuts = [
  { label: 'Services', description: 'Pilihan, durasi, dan harga layanan.', href: '/services', icon: Scissors, number: '01' },
  { label: 'Style Gallery', description: 'Galeri hasil belum tersedia.', href: '/style-gallery', icon: Sparkles, number: '02' },
  { label: 'Offers & Membership', description: 'Promo dan benefit belum tersedia.', href: '/offers-membership', icon: Gift, number: '03' },
  { label: 'Our Branches', description: 'Informasi cabang yang dipublikasikan.', href: '/branches', icon: MapPin, number: '04' },
  { label: 'My GGS', description: 'Riwayat dan preferensi belum terhubung.', href: '/my-ggs', icon: UserRound, number: '05' },
];

function HomePage({ services, servicesQuery, site, openBooking }: SharedProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const slides = [
    {
      eyebrow: 'GGS HAIR STUDIO · MULAI DARI SINI',
      headline: <>Sebelum gunting,<br /><em>kita ngobrol.</em></>,
      detail: site?.tagline?.trim() || 'Ceritakan kebutuhan rambutmu sebelum memilih layanan.',
      cta: 'Ajukan janji',
      path: '/book',
    },
    {
      eyebrow: 'LAYANAN GGS',
      headline: <>Pilih layanan<br /><em>yang sesuai.</em></>,
      detail: 'Lihat layanan, durasi, dan harga yang saat ini tersedia. Tim GGS akan membahas detail sebelum mengonfirmasi.',
      cta: 'Lihat layanan',
      path: '/services',
    },
    {
      eyebrow: 'AJUKAN JANJI TEMU',
      headline: <>Mulai dari<br /><em>obrolan.</em></>,
      detail: 'Sampaikan layanan dan waktu yang kamu inginkan. Tim GGS akan menghubungi untuk membahas dan mengonfirmasi permintaan.',
      cta: 'Buat janji',
      path: '/book',
    },
  ];

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(motionPreference.matches);
    const updatePageVisibility = () => setPageVisible(document.visibilityState === 'visible');
    updateMotionPreference();
    updatePageVisibility();
    motionPreference.addEventListener('change', updateMotionPreference);
    document.addEventListener('visibilitychange', updatePageVisibility);
    return () => {
      motionPreference.removeEventListener('change', updateMotionPreference);
      document.removeEventListener('visibilitychange', updatePageVisibility);
    };
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || !pageVisible) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, pageVisible, slides.length]);

  const slide = slides[active];
  return (
    <>
      <section
        className="clearer-hero"
        aria-label="Sorotan GGS"
        aria-roledescription="carousel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
        }}
        data-testid="carousel-home"
      >
        <div className="clearer-hero-copy" key={active}>
          <p className="clearer-kicker">{slide.eyebrow}</p>
          <h1 data-testid="text-hero-title">{slide.headline}</h1>
          <p className="clearer-lede" data-testid="text-hero-intro">{slide.detail}</p>
          <div className="clearer-hero-actions">
            <Link className="clearer-primary-button" href={slide.path} data-testid="link-hero-action">
              {slide.cta} <ArrowRight size={17} />
            </Link>
            <Link className="clearer-text-link" href="/services" data-testid="link-hero-services">
              Lihat semua layanan <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="clearer-carousel-controls" aria-label="Kontrol banner">
            <div className="clearer-carousel-dots" aria-label="Pilih sorotan">
              {slides.map((item, index) => (
                <button
                  type="button"
                  key={item.eyebrow}
                  aria-label={`Tampilkan sorotan ${index + 1}`}
                  aria-current={active === index ? 'true' : undefined}
                  onClick={() => setActive(index)}
                  data-testid={`button-banner-${index + 1}`}
                ><span /></button>
              ))}
            </div>
            <div className="clearer-carousel-arrows">
              <span>{String(active + 1).padStart(2, '0')} / 03</span>
              <button type="button" aria-label="Sorotan sebelumnya" onClick={() => setActive((active + 2) % 3)} data-testid="button-banner-previous"><ArrowLeft size={17} /></button>
              <button type="button" aria-label="Sorotan berikutnya" onClick={() => setActive((active + 1) % 3)} data-testid="button-banner-next"><ArrowRight size={17} /></button>
            </div>
          </div>
        </div>
        <div className="clearer-hero-image">
          <img
            src={site?.heroImageUrl || '/ggs-editorial.jpg'}
            alt="Foto editorial gaya rambut GGS"
            data-testid={site?.heroImageUrl ? 'img-hero-api' : 'img-hero-editorial'}
          />
          <span className="clearer-hero-image-label">Gaya editorial GGS</span>
        </div>
      </section>

        <section className="clearer-home-menu" aria-label="Jelajahi GGS">
        <div className="clearer-home-menu-heading">
          <p className="clearer-kicker">JELAJAHI GGS</p>
          <h2>Mau mulai<br />dari mana?</h2>
        </div>
        <div className="clearer-home-menu-grid">
          {homeShortcuts.map((item) => (
            <Link className="clearer-home-menu-card" href={item.href} key={item.href} data-testid={`link-home-menu-${item.href.slice(1)}`}>
              <span className="clearer-home-menu-card-top"><item.icon size={20} /><span>{item.number}</span></span>
              <strong>{item.label}</strong>
              <span className="clearer-home-menu-description">{item.description}</span>
            </Link>
          ))}
          <Link className="clearer-home-menu-card clearer-home-book-card" href="/book" data-testid="link-home-menu-book">
            <span className="clearer-home-menu-card-top"><CalendarDays size={20} /><ArrowUpRight size={16} /></span>
            <strong>Book Appointment</strong>
            <span className="clearer-home-menu-description">Ajukan layanan, tanggal, dan waktu kunjungan.</span>
          </Link>
        </div>
      </section>

      <section className="clearer-promise" data-testid="section-approach">
        <div className="clearer-promise-intro">
          <p className="clearer-kicker">CARA KERJA</p>
          <h2>Mulai dengan<br />lebih jelas.</h2>
          <p>{site?.introduction?.trim() || 'Informasi tentang GGS belum tersedia.'}</p>
        </div>
        <div className="clearer-steps">
          <article><span>01</span><h3>Ceritakan</h3><p>Gaya yang kamu suka dan perubahan yang ingin dicoba.</p></article>
          <article><span>02</span><h3>Pilih bersama</h3><p>Tim GGS akan membahas pilihan, waktu, dan harga sebelum janji dikonfirmasi.</p></article>
          <article><span>03</span><h3>Konfirmasi</h3><p>Permintaanmu menjadi awal percakapan dengan tim studio.</p></article>
        </div>
      </section>

      <section className="clearer-services home-featured-services">
        <div className="clearer-section-heading">
          <div><p className="clearer-kicker">LAYANAN YANG TERSEDIA</p><h2>Pilihan layanan.</h2></div>
          <Link href="/services" className="clearer-text-link" data-testid="link-all-services">Semua layanan <ArrowRight size={16} /></Link>
        </div>
        <ServiceList {...{ services, servicesQuery, openBooking }} compact />
      </section>

      <section className="home-editorial-band">
        <div className="home-editorial-index">GGS / CATATAN 01</div>
        <p>Inspirasi gaya akan hadir di sini.<br /><em>Style Gallery belum tersedia.</em></p>
        <Link href="/style-gallery" data-testid="link-home-inspiration">Buka Style Gallery <ArrowUpRight size={17} /></Link>
      </section>
      <section className="home-last-cta">
        <div><p className="clearer-kicker">BOOK APPOINTMENT</p><h2>Ceritakan<br /><em>yang kamu inginkan.</em></h2></div>
        <Link href="/book" className="clearer-primary-button" data-testid="link-home-booking">Buat janji <ArrowRight size={17} /></Link>
      </section>
    </>
  );
}

function ServicesPage(props: SharedProps) {
  const { services, servicesQuery, openBooking } = props;
  return (
    <PageFrame kicker="GGS / SERVICES" title={<>Pilihan<br /><em>layanan.</em></>} intro="Lihat layanan yang saat ini tersedia, beserta durasi dan harganya. Tim GGS akan menghubungi untuk membahas detail dan mengonfirmasi permintaan." testId="page-services">
      <div className="service-category-grid" aria-label="Kategori layanan yang diminta" data-testid="list-service-categories">
        {["Men's Grooming", "Women's Hair", 'Hair Treatment', 'Beauty & Spa'].map((category, index) => (
          <article key={category} data-testid={`card-service-category-${index}`}>
            <strong>{category}</strong>
            <span>Belum dipetakan</span>
          </article>
        ))}
      </div>
      <div className="service-page-note" data-testid="text-service-category-note">
        <Sparkles size={18} /> Kategori di atas belum dipetakan ke layanan aktif. Daftar di bawah mengikuti kategori yang saat ini tersimpan di data GGS.
      </div>
      <ServiceList {...{ services, servicesQuery, openBooking }} />
      <div className="service-followup"><p>Belum yakin layanan mana yang sesuai?</p><Link href="/book" className="clearer-text-link" data-testid="link-services-consult">Ceritakan kebutuhanmu <ArrowRight size={16} /></Link></div>
    </PageFrame>
  );
}

function ServiceList({ services, servicesQuery, openBooking, compact = false }: {
  services: GgsService[];
  servicesQuery: SharedProps['servicesQuery'];
  openBooking: (serviceId?: number) => void;
  compact?: boolean;
}) {
  if (servicesQuery.isLoading) return <div className="clearer-service-state service-skeleton" data-testid="status-services-loading"><span /><span /><span /></div>;
  if (servicesQuery.isError) return (
    <div className="clearer-service-state" role="alert" data-testid="status-services-error">
        <p>Daftar layanan belum bisa dimuat.</p>
        <button className="clearer-retry" type="button" onClick={() => servicesQuery.refetch()} data-testid="button-retry-services">Coba lagi</button>
    </div>
  );
  if (!services.length) return <div className="clearer-service-state" data-testid="status-services-empty"><p>Belum ada layanan aktif yang ditampilkan.</p></div>;
  return (
    <div className={`clearer-service-list ${compact ? 'service-list-compact' : ''}`}>
      {services.slice(0, compact ? 3 : undefined).map((service, index) => (
        <article className="clearer-service-row" key={service.id} data-testid={`card-service-${service.id}`}>
          <span className="clearer-service-index">{String(index + 1).padStart(2, '0')}</span>
          <div className="clearer-service-main">
            <span className="service-category">{service.category}</span>
            <h3>{service.name}</h3><p>{service.description}</p>
          </div>
          <div className="clearer-service-meta">
              <span className="clearer-duration"><Clock3 size={15} /> {service.durationMinutes} menit</span>
            <strong>{money(service.price)}</strong>
          </div>
          <Link href="/book" className="clearer-service-action" onClick={() => openBooking(service.id)} aria-label={`Ajukan ${service.name}`} data-testid={`link-book-service-${service.id}`}>Pilih <ArrowRight size={16} /></Link>
        </article>
      ))}
    </div>
  );
}

type BookingProps = SharedProps & {
  fields: BookingFields;
  updateField: (key: keyof BookingFields, value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  appointment: ReturnType<typeof useCreateGgsAppointment>;
  submitted: boolean;
  setSubmitted: (value: boolean) => void;
  setFields: (value: BookingFields) => void;
};

function BookingPage({ services, servicesQuery, fields, updateField, handleSubmit, appointment, submitted, setSubmitted, setFields }: BookingProps) {
  return (
    <PageFrame kicker="GGS / BOOK APPOINTMENT" title={<>Buat ruang<br /><em>untuk dirimu.</em></>} intro="Sampaikan layanan dan waktu yang kamu inginkan. Formulir ini mengirim permintaan; tim GGS akan menghubungi untuk membahas detail dan mengonfirmasi." testId="page-booking">
      <section className="booking-page-layout">
        <aside className="booking-aside">
          <div className="booking-aside-mark"><CalendarDays size={22} /></div>
          <p className="clearer-kicker">SEBELUM MENGAJUKAN</p>
          <h2>Mulai dengan<br /><em>percakapan.</em></h2>
          <p>Tanggal dan waktu yang kamu pilih adalah permintaan, bukan jadwal yang sudah dikonfirmasi. Tim GGS akan menghubungi sebelum kunjungan ditetapkan.</p>
          <div className="booking-aside-detail"><span>Cabang</span><strong>Belum tersedia</strong><small>Informasi lokasi akan diberikan saat tim mengonfirmasi permintaan.</small></div>
          <div className="booking-aside-detail"><span>Hairstylist</span><strong>Belum tersedia</strong><small>Pilihan hairstylist belum tersedia di formulir ini.</small></div>
        </aside>
        <div className="clearer-form-wrap">
          {submitted && appointment.data ? (
            <div role="status" className="clearer-success" data-testid="status-booking-success">
              <span className="clearer-success-icon"><Check size={23} /></span>
              <p className="clearer-kicker">PERMINTAAN DITERIMA</p>
              <h3>Terima kasih, {appointment.data.customerName}.</h3>
              <p>Permintaan untuk <strong>{appointment.data.serviceName}</strong> pada <strong>{new Date(`${appointment.data.appointmentDate}T${appointment.data.appointmentTime}`).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</strong> sudah diterima. Tim GGS akan menghubungimu untuk konfirmasi.</p>
              <p data-testid="text-appointment-reference">Nomor permintaan: <strong>#{appointment.data.id}</strong></p>
              <button type="button" className="clearer-secondary-button" onClick={() => { setSubmitted(false); setFields(initialFields); appointment.reset(); }} data-testid="button-new-booking">Buat permintaan lain</button>
            </div>
          ) : (
            <form className="clearer-form" onSubmit={handleSubmit} data-testid="form-appointment">
              <div className="clearer-form-grid">
                <label>Nama<input required minLength={2} maxLength={120} autoComplete="name" value={fields.customerName} onChange={(event) => updateField('customerName', event.target.value)} placeholder="Nama yang biasa digunakan" data-testid="input-customer-name" /></label>
                <label>Nomor telepon<input required type="tel" minLength={7} maxLength={40} autoComplete="tel" value={fields.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Nomor yang bisa dihubungi" data-testid="input-customer-phone" /></label>
                <label className="clearer-form-wide">Email<input required type="email" maxLength={254} autoComplete="email" value={fields.email} onChange={(event) => updateField('email', event.target.value)} placeholder="nama@email.com" data-testid="input-customer-email" /></label>
                <label className="clearer-form-wide">Layanan<select required value={fields.serviceId} onChange={(event) => updateField('serviceId', event.target.value)} disabled={!services.length} data-testid="select-service">
                  <option value="" disabled>{servicesQuery.isLoading ? 'Memuat layanan…' : services.length ? 'Pilih layanan' : 'Belum ada layanan tersedia'}</option>
                  {services.map((service) => <option value={service.id} key={service.id}>{service.name} · {money(service.price)} · {service.durationMinutes} menit</option>)}
                </select></label>
                <label>Tanggal yang diinginkan<input type="date" min={today} required value={fields.appointmentDate} onChange={(event) => updateField('appointmentDate', event.target.value)} data-testid="input-appointment-date" /></label>
                <label>Waktu yang diinginkan<input type="time" required value={fields.appointmentTime} onChange={(event) => updateField('appointmentTime', event.target.value)} data-testid="input-appointment-time" /></label>
                <label className="clearer-form-wide">Catatan untuk tim <span>(opsional)</span><textarea maxLength={600} value={fields.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Ceritakan hal yang perlu diketahui tentang rambut atau permintaanmu." data-testid="input-appointment-notes" /></label>
                {appointment.isError && <p role="alert" className="clearer-error" data-testid="status-booking-error">Permintaan belum terkirim. Coba lagi; detail yang kamu isi tetap tersimpan.</p>}
              </div>
              <div className="clearer-submit-row"><p>Tim GGS akan menghubungimu untuk mengonfirmasi detail kunjungan.</p><button type="submit" className="clearer-primary-button" disabled={appointment.isPending || !services.length} data-testid="button-submit-appointment">{appointment.isPending ? 'Mengirim permintaan…' : 'Kirim permintaan'} {!appointment.isPending && <ArrowRight size={17} />}</button></div>
            </form>
          )}
        </div>
      </section>
    </PageFrame>
  );
}

function GalleryPage() {
  return (
    <PageFrame kicker="GGS / STYLE GALLERY" title={<>Galeri gaya,<br /><em>sedang disiapkan.</em></>} intro="Tempat untuk inspirasi potongan, warna rambut, transformasi, dan hasil pelanggan setelah foto serta keterangannya tersedia dan diverifikasi." testId="page-gallery">
      <section className="unavailable-panel gallery-empty" data-testid="status-gallery-empty">
        <div className="empty-ornament"><Sparkles size={25} /></div>
        <span className="panel-index">GALERI / 00</span>
        <h2>Belum ada hasil GGS<br />yang ditampilkan.</h2>
        <p>Foto pada halaman Home adalah gambar editorial, bukan hasil pelanggan. Inspirasi gaya akan ditambahkan setelah foto dan keterangannya tersedia serta diverifikasi.</p>
        <Link href="/services" className="clearer-text-link" data-testid="link-gallery-services">Lihat Services <ArrowRight size={16} /></Link>
      </section>
      <div className="gallery-placeholder-grid" aria-label="Bagian galeri yang belum tersedia">
        {['Warna rambut', 'Transformasi', 'Hasil pelanggan'].map((title, index) => <div className="gallery-placeholder" key={title} data-testid={`status-gallery-category-${index}`}><span>0{index + 1}</span><strong>{title}</strong><small>Belum tersedia</small></div>)}
      </div>
    </PageFrame>
  );
}

function OffersPage() {
  return (
    <PageFrame kicker="GGS / OFFERS & MEMBERSHIP" title={<>Promo &amp;<br /><em>keanggotaan.</em></>} intro="Halaman ini akan memuat promo, paket bundling, poin, voucher, dan benefit member jika programnya sudah tersedia." testId="page-offers">
      <section className="unavailable-panel member-empty" data-testid="status-membership-unavailable">
        <div className="empty-ornament"><Gift size={25} /></div>
        <span className="panel-index">PROGRAM MEMBER / BELUM TERSEDIA</span>
        <h2>Belum ada promo atau<br />program member.</h2>
        <p>Belum ada informasi promo, paket bundling, poin, atau voucher dari GGS. Belum ada saldo member yang bisa ditampilkan dan halaman ini belum menyediakan pendaftaran.</p>
        <Link href="/book" className="clearer-primary-button" data-testid="link-membership-book">Tanyakan saat mengajukan janji <ArrowRight size={16} /></Link>
      </section>
      <div className="member-feature-list">
        <article><span>01</span><div><strong>Promo</strong><p>Belum ada promo aktif yang dicantumkan.</p></div></article>
        <article><span>02</span><div><strong>Poin & voucher</strong><p>Belum ada data poin atau voucher.</p></div></article>
        <article><span>03</span><div><strong>Benefit member</strong><p>Informasi keanggotaan belum tersedia.</p></div></article>
      </div>
    </PageFrame>
  );
}

function BranchesPage({ site, siteQuery }: SharedProps) {
  const address = site?.address?.trim();
  const phone = site?.phone?.trim();
  const hours = site?.openingHours?.trim();
  const instagram = site?.instagramHandle?.trim();
  return (
    <PageFrame kicker="GGS / OUR BRANCHES" title={<>Kunjungi<br /><em>studio GGS.</em></>} intro="Temukan informasi sebelum berkunjung. Halaman ini hanya menampilkan detail yang sudah dicantumkan oleh GGS." testId="page-branches">
      {siteQuery.isLoading ? <div className="clearer-visit-empty" data-testid="status-branches-loading">Memuat informasi studio…</div> :
        siteQuery.isError ? <div className="clearer-visit-empty" role="alert" data-testid="status-branches-error"><p>Informasi studio belum bisa dimuat.</p><button type="button" onClick={() => siteQuery.refetch()} data-testid="button-retry-site">Coba lagi</button></div> :
          address || phone || hours || instagram ? (
            <div className="branch-details" data-testid="section-branch-details">
              {address && <article><MapPin size={19} /><span>Alamat</span><p>{address}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" data-testid="link-map">Buka peta <ArrowUpRight size={15} /></a></article>}
              {hours && <article><Clock3 size={19} /><span>Jam operasional</span><p>{hours}</p></article>}
              {phone && <article><Phone size={19} /><span>Kontak</span><p>{phone}</p><a href={`tel:${phone}`} data-testid="link-branch-phone">Hubungi studio <ArrowUpRight size={15} /></a></article>}
              {instagram && <article><Instagram size={19} /><span>Instagram</span><p>{instagram}</p><a href={`https://instagram.com/${instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" data-testid="link-branch-instagram">Lihat Instagram <ArrowUpRight size={15} /></a></article>}
              <article className="branch-no-facilities"><Compass size={19} /><span>Fasilitas & cabang</span><p>Informasi fasilitas dan cabang lain belum dicantumkan.</p></article>
            </div>
          ) : (
            <section className="unavailable-panel branch-empty" data-testid="status-branches-empty">
              <div className="empty-ornament"><MapPin size={25} /></div>
              <span className="panel-index">DETAIL STUDIO / BELUM DIPUBLIKASIKAN</span>
              <h2>Alamat studio<br />belum tersedia.</h2>
              <p>Alamat, jam operasional, telepon, Instagram, dan fasilitas cabang belum dicantumkan pada profil publik GGS. Ajukan janji dan tim GGS akan menyampaikan detail kunjungan saat konfirmasi.</p>
              <Link href="/book" className="clearer-primary-button" data-testid="link-branch-book">Ajukan janji <ArrowRight size={16} /></Link>
            </section>
          )}
      <div className="branch-contact-note"><span>CATATAN KUNJUNGAN</span><p>Pilihan cabang dan hairstylist belum tersedia di formulir janji temu.</p></div>
    </PageFrame>
  );
}

function MyGgsPage() {
  return (
    <PageFrame kicker="GGS / MY GGS" title={<>My GGS,<br /><em>belum aktif.</em></>} intro="Tempat untuk melihat booking mendatang, riwayat kunjungan, poin, voucher, dan preferensi gaya. Data tersebut belum terhubung." testId="page-my-ggs">
      <section className="unavailable-panel myggs-empty" data-testid="status-my-ggs-unavailable">
        <div className="empty-ornament"><UserRound size={25} /></div>
        <span className="panel-index">MY GGS / DATA PRIBADI BELUM TERHUBUNG</span>
        <h2>Riwayat kunjunganmu<br />belum bisa ditampilkan.</h2>
        <p>Website ini belum memiliki akun pelanggan, riwayat booking, atau data member. Permintaan janji dikelola oleh tim studio dan belum tampil sebagai riwayat pribadi.</p>
        <Link href="/book" className="clearer-primary-button" data-testid="link-my-ggs-book">Ajukan janji <ArrowRight size={16} /></Link>
      </section>
      <div className="myggs-record-grid">
        {[
          { label: 'Booking mendatang', value: 'Belum terhubung', note: 'Data booking akun belum tersedia' },
          { label: 'Riwayat kunjungan', value: 'Belum terhubung', note: 'Data kunjungan pelanggan belum tersedia' },
          { label: 'Poin & voucher', value: 'Belum tersedia', note: 'Belum ada saldo atau voucher yang dicantumkan' },
          { label: 'Preferensi gaya', value: 'Belum disimpan', note: 'Website ini belum menyimpan data profil' },
        ].map((item, index) => <article key={item.label} data-testid={`card-my-ggs-${index}`}><span>0{index + 1} / {item.label}</span><strong>{item.value}</strong><p>{item.note}</p></article>)}
      </div>
    </PageFrame>
  );
}

function PageFrame({ kicker, title, intro, children, testId }: {
  kicker: string;
  title: ReactNode;
  intro: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div className="inner-page" data-testid={testId}>
      <section className="inner-page-hero">
        <div><p className="clearer-kicker">{kicker}</p><h1>{title}</h1></div>
        <p className="inner-page-intro">{intro}</p>
        <span className="inner-page-stamp">GGS<br />STUDIO</span>
      </section>
      <div className="inner-page-content">{children}</div>
    </div>
  );
}

function NotFound() {
  return (
    <PageFrame kicker="GGS / HALAMAN TIDAK DITEMUKAN" title={<>Halaman ini<br /><em>tidak tersedia.</em></>} intro="Alamat ini bukan bagian dari website GGS. Kembali ke Home atau lihat daftar layanan." testId="page-not-found">
      <div className="unavailable-panel"><h2>Kembali ke halaman utama.</h2><Link href="/" className="clearer-primary-button" data-testid="link-not-found-home">Kembali ke GGS <ArrowRight size={16} /></Link></div>
    </PageFrame>
  );
}

export default App;
