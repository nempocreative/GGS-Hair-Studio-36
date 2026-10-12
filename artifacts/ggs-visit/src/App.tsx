import { useMemo, useState, type FormEvent } from 'react';
import { useGetGgsSite, getGetGgsSiteQueryKey, useGetGgsPublicServices, getGetGgsPublicServicesQueryKey, useCreateGgsAppointment } from '@workspace/api-client-react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Instagram, MapPin, Menu, Scissors, Sparkles, X } from 'lucide-react';

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

function App() {
  const siteQuery = useGetGgsSite({ query: { queryKey: getGetGgsSiteQueryKey() } });
  const servicesQuery = useGetGgsPublicServices({ query: { queryKey: getGetGgsPublicServicesQueryKey() } });
  const appointment = useCreateGgsAppointment();
  const [fields, setFields] = useState<BookingFields>(initialFields);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const services = useMemo(() => servicesQuery.data?.filter((service) => service.active) ?? [], [servicesQuery.data]);
  const site = siteQuery.data;

  const setField = (name: keyof BookingFields, value: string) => setFields((current) => ({ ...current, [name]: value }));
  const goToBooking = (serviceId?: number) => {
    if (serviceId) setField('serviceId', String(serviceId));
    setMenuOpen(false);
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(false);
    appointment.mutate({
      data: {
        customerName: fields.customerName.trim(),
        email: fields.email.trim(),
        phone: fields.phone.trim(),
        serviceId: Number(fields.serviceId),
        appointmentDate: fields.appointmentDate,
        appointmentTime: fields.appointmentTime,
        notes: fields.notes.trim(),
      },
    }, {
      onSuccess: () => {
        setSubmitted(true);
        setFields(initialFields);
      },
    });
  };

  const nav = [
    { label: 'Studio', href: '#studio' },
    { label: 'Layanan', href: '#layanan' },
    { label: 'Ruang kami', href: '#ruang' },
    { label: 'Kunjungi', href: '#kunjungi' },
  ];

  return (
    <main className="page-enter overflow-hidden">
      <div className="bg-[#d4b56f] px-4 py-[9px] text-center text-[10px] font-mono tracking-[.14em] text-[#17130b] md:text-[11px]" data-testid="text-notice">
        STUDIO INDEPENDEN · POTONGAN DENGAN KARAKTER · JAKARTA
      </div>
      <header className="sticky top-0 z-50 border-b border-[#d4b56f]/15 bg-[#0c0b0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-10">
          <a href="#beranda" aria-label="GGS — kembali ke atas" data-testid="link-home" className="group flex items-center gap-3">
            <span className="grid size-10 place-items-center border border-[#d4b56f]/55 font-display text-[22px] leading-none text-[#d4b56f] transition group-hover:bg-[#d4b56f] group-hover:text-[#0c0b0a]">G</span>
            <span className="text-[15px] font-semibold tracking-[.26em]">GGS<span className="ml-2 text-[9px] font-normal tracking-[.2em] text-[#a49d90]">HAIR STUDIO</span></span>
          </a>
          <nav aria-label="Navigasi utama" className="hidden items-center gap-9 md:flex">
            {nav.map((item) => <a className="nav-link text-[12px] tracking-wide text-[#c7c0b4] hover:text-[#eee9de]" href={item.href} key={item.href} data-testid={`link-nav-${item.href.slice(1)}`}>{item.label}</a>)}
          </nav>
          <button type="button" onClick={() => goToBooking()} className="btn-gold hidden items-center gap-3 px-5 py-[13px] text-[11px] font-semibold tracking-[.12em] md:flex" data-testid="button-book-nav">
            BUAT JANJI <ArrowUpRight size={14} strokeWidth={1.6} />
          </button>
          <button type="button" className="grid size-11 place-items-center border border-[#d4b56f]/35 md:hidden" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} data-testid="button-menu">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && <nav aria-label="Navigasi ponsel" className="border-t border-[#d4b56f]/15 bg-[#11100e] px-6 py-4 md:hidden">
          {nav.map((item) => <a className="block border-b border-white/5 py-4 text-sm text-[#d1cabe]" href={item.href} key={item.href} onClick={() => setMenuOpen(false)} data-testid={`link-mobile-${item.href.slice(1)}`}>{item.label}</a>)}
          <button type="button" className="btn-gold mt-4 flex w-full items-center justify-center gap-2 py-3 text-xs tracking-widest" onClick={() => goToBooking()} data-testid="button-book-mobile">BUAT JANJI <ArrowRight size={14} /></button>
        </nav>}
      </header>

      <section id="beranda" className="relative mx-auto grid min-h-[690px] max-w-[1440px] items-center px-5 pb-16 pt-14 md:min-h-[740px] md:grid-cols-[1.04fr_.96fr] md:px-10 md:py-20">
        <div className="relative z-10 order-2 max-w-[700px] md:order-1 md:pb-6">
          <div className="rise eyebrow mb-7 flex items-center gap-3" data-testid="text-hero-overline"><span className="h-px w-8 bg-[#d4b56f]" /> {site?.brandName ? `${site.brandName} · STUDIO RAMBUT INDEPENDEN` : 'STUDIO RAMBUT INDEPENDEN'}</div>
          <h1 className="rise delay-1 font-display text-[clamp(4.8rem,10vw,9.5rem)] leading-[.76] tracking-[-.055em] text-[#eee9de]" data-testid="text-hero-title">
            Rambutmu.<br /><span className="italic font-normal text-[#d4b56f]">Aturanmu.</span>
          </h1>
          <p className="rise delay-2 mt-8 max-w-[440px] text-[15px] leading-[1.9] text-[#aaa398] md:mt-10 md:text-[16px]" data-testid="text-hero-intro">
            {site?.tagline || 'Potongan yang terasa seperti dirimu. Warna yang tak perlu menjelaskan apa-apa. Ruang untuk kembali pada versi paling jujur.'}
          </p>
          <div className="rise delay-3 mt-9 flex flex-wrap items-center gap-4 md:mt-11">
            <button type="button" className="btn-gold flex items-center gap-4 px-6 py-[17px] text-[11px] font-semibold tracking-[.13em]" onClick={() => goToBooking()} data-testid="button-book-hero">TEMUKAN WAKTUMU <ArrowRight size={15} /></button>
            <a href="#layanan" className="btn-outline flex items-center gap-3 px-5 py-[16px] text-[11px] tracking-[.1em] text-[#d8d1c6]" data-testid="link-explore-services">JELAJAHI STUDIO <ArrowDown size={14} /></a>
          </div>
          <div className="mt-12 flex items-center gap-5 border-t border-white/10 pt-5 md:mt-16">
            <span className="font-display text-[40px] italic leading-none text-[#d4b56f]">01</span>
            <span className="max-w-[220px] text-[10px] leading-relaxed tracking-[.1em] text-[#8f897f]">TIDAK ADA POTONGAN YANG SAMA.<br />KARENA TIDAK ADA KAMU YANG LAIN.</span>
          </div>
        </div>
        <div className="rise delay-2 order-1 relative mx-auto mb-12 aspect-[.91] w-full max-w-[500px] md:order-2 md:mb-0 md:ml-auto md:max-w-[560px]">
          <div className="absolute -right-3 -top-4 h-[70%] w-[75%] border border-[#d4b56f]/40 md:-right-6 md:-top-6" />
          <div className="media-frame grain relative h-full overflow-hidden bg-[#211a19]">
            {site?.heroImageUrl ? <img src={site.heroImageUrl} alt="Potret editorial gaya rambut GGS" className="media-image h-full w-full object-cover" data-testid="img-hero-api" /> : <img src="/ggs-editorial.jpg" alt="Potret editorial gaya rambut berkarakter" className="media-image h-full w-full object-cover" data-testid="img-hero-editorial" />}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0b0a]/80 via-transparent to-[#0c0b0a]/5" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between md:bottom-8 md:left-8 md:right-8">
              <div><span className="eyebrow text-[9px]">POTONGAN DENGAN INTENSI</span><p className="mt-2 font-display text-[28px] italic">No one wears it like you.</p></div>
              <span className="mb-1 grid size-10 place-items-center rounded-full border border-[#d4b56f]/70 text-[#d4b56f]"><ArrowUpRight size={17} /></span>
            </div>
          </div>
          <span className="drift absolute -left-6 top-[28%] hidden size-[82px] items-center justify-center rounded-full border border-[#d4b56f]/30 bg-[#0c0b0a] text-center font-mono text-[8px] leading-[1.8] tracking-[.14em] text-[#d4b56f] md:flex">RITUAL<br />BUKAN<br />RUTINITAS</span>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-[12%] left-[36%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(171,57,130,.1),transparent_70%)]" />
      </section>

      <section className="relative border-y border-[#d4b56f]/15 bg-[#11100e]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-6 px-5 py-7 md:px-10 md:py-8">
          <p className="max-w-[320px] font-display text-[23px] italic text-[#e3dac9] md:text-[27px]">"Bukan transformasi. <span className="text-[#d4b56f]">Sebuah pengenalan.</span>"</p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[9px] font-mono tracking-[.13em] text-[#938c81] md:gap-x-12">
            <span className="flex items-center gap-2"><Scissors size={13} className="text-[#d4b56f]" /> PRESISI, BUKAN TERBURU-BURU</span>
            <span className="flex items-center gap-2"><Sparkles size={13} className="text-[#d4b56f]" /> KONSULTASI TANPA PENGHAKIMAN</span>
          </div>
        </div>
      </section>

      <section id="studio" className="mx-auto grid max-w-[1440px] gap-12 px-5 py-24 md:grid-cols-[.85fr_1.15fr] md:gap-20 md:px-10 md:py-36">
        <div>
          <span className="eyebrow" data-testid="text-studio-overline">SEBUAH RUANG UNTUK DIRIMU</span>
          <h2 className="mt-6 max-w-[470px] font-display text-[clamp(3.3rem,6vw,6rem)] leading-[.88] tracking-[-.04em]">Kamu tak perlu <i className="text-[#d4b56f]">berubah.</i></h2>
        </div>
        <div className="max-w-[580px] self-end md:pb-2">
          <p className="text-[15px] leading-[1.95] text-[#b7afa2] md:text-[17px]" data-testid="text-studio-description">
            {site?.introduction || 'GGS adalah studio rambut independen untuk mereka yang ingin didengar sebelum disentuh. Kami percaya hasil terbaik dimulai dari percakapan yang baik—tentang hidupmu, rambutmu, dan bagaimana kamu ingin merasa saat melangkah keluar.'}
          </p>
          <div className="mt-9 flex items-center gap-5">
            <span className="fusion-line w-14" />
            <p className="font-mono text-[9px] uppercase tracking-[.12em] text-[#9b9387]">DENGAR DULU. POTONG KEMUDIAN.</p>
          </div>
        </div>
        <div className="relative md:col-span-2">
          <div className="fusion-line w-full opacity-70" />
          <div className="grid grid-cols-1 gap-8 py-8 sm:grid-cols-3 md:gap-12 md:py-10">
            {[
              { n: '01', title: 'Dengarkan', body: 'Konsultasi dimulai dari apa yang kamu inginkan—bukan apa yang sedang tren.' },
              { n: '02', title: 'Rancang', body: 'Setiap detail disesuaikan dengan tekstur, ritme, dan hidupmu sehari-hari.' },
              { n: '03', title: 'Jadilah', body: 'Pulang dengan rambut yang bukan sekadar terlihat baik. Tapi terasa benar.' },
            ].map((item) => <article key={item.n} className="border-l border-[#d4b56f]/30 pl-5 md:pl-7" data-testid={`card-ritual-${item.n}`}>
              <span className="font-mono text-[10px] text-[#d4b56f]">{item.n} / 03</span>
              <h3 className="mt-3 font-display text-[31px] italic">{item.title}</h3>
              <p className="mt-2 max-w-[290px] text-[12px] leading-[1.8] text-[#9c958a]">{item.body}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section id="layanan" className="relative border-y border-[#d4b56f]/15 bg-[#11100e] px-5 py-24 md:px-10 md:py-32">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-12 flex flex-col justify-between gap-5 md:mb-16 md:flex-row md:items-end">
            <div><span className="eyebrow" data-testid="text-services-overline">MENU STUDIO</span><h2 className="mt-5 font-display text-[clamp(3rem,6vw,5.5rem)] leading-[.9] tracking-[-.04em]">Ritual rambut,<br /><i className="text-[#d4b56f]">caramu.</i></h2></div>
            <p className="max-w-[330px] text-[13px] leading-[1.85] text-[#a49d90]">Dari perubahan yang berani sampai perawatan yang lembut. Pilih titik awalmu—sisanya kita bicarakan bersama.</p>
          </div>
          {servicesQuery.isLoading ? <div className="grid gap-4 md:grid-cols-2" aria-label="Memuat layanan" data-testid="status-services-loading">{[1, 2, 3, 4].map((item) => <div className="h-52 animate-pulse border border-white/5 bg-white/[.025]" key={item} />)}</div> :
            servicesQuery.isError ? <div className="border border-[#d4b56f]/25 bg-[#171512] p-7 md:p-10" role="alert" data-testid="status-services-error"><p className="eyebrow">BELUM TERHUBUNG</p><p className="mt-3 font-display text-3xl">Menu layanan belum dapat dimuat.</p><p className="mt-2 text-sm text-[#a49d90]">Coba muat ulang daftar layanan untuk melihat pilihan terbaru dari studio.</p><button type="button" onClick={() => servicesQuery.refetch()} className="btn-outline mt-6 px-5 py-3 text-xs" data-testid="button-retry-services">COBA LAGI</button></div> :
              services.length === 0 ? <div className="border border-[#d4b56f]/25 bg-[#171512] p-7 md:p-10" data-testid="status-services-empty"><p className="eyebrow">MENU STUDIO</p><p className="mt-3 font-display text-3xl">Kami sedang merapikan menu.</p><p className="mt-2 text-sm text-[#a49d90]">Belum ada layanan yang tersedia untuk dipesan. Silakan mampir kembali.</p></div> :
                <div className="grid gap-3 md:grid-cols-2">
                  {services.map((service, index) => <article key={service.id} className="service-card group relative flex min-h-[220px] flex-col justify-between border border-[#3a352b] bg-[#141210] p-6 md:p-8" data-testid={`card-service-${service.id}`}>
                    <div className="flex items-start justify-between gap-5">
                      <div><span className="font-mono text-[9px] uppercase tracking-[.16em] text-[#d4b56f]">{service.category}</span><h3 className="mt-3 font-display text-[34px] leading-none">{service.name}</h3></div>
                      <span className="font-display text-[25px] text-[#d4b56f]">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <p className="mt-6 max-w-[490px] text-[12px] leading-[1.8] text-[#a49d90]">{service.description}</p>
                    <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
                      <span className="flex items-center gap-2 text-[10px] text-[#aaa398]"><Clock3 size={13} className="text-[#d4b56f]" /> {service.durationMinutes} MENIT <span className="mx-1 text-white/20">/</span> <span className="font-mono text-[12px] text-[#e7dfd0]">Rp{new Intl.NumberFormat('id-ID').format(service.price)}</span></span>
                      <button type="button" className="flex items-center gap-2 text-[10px] tracking-[.1em] text-[#d4b56f] transition group-hover:gap-3" onClick={() => goToBooking(service.id)} data-testid={`button-book-service-${service.id}`}>PILIH LAYANAN <ArrowRight size={13} /></button>
                    </div>
                  </article>)}
                </div>}
          <p className="mt-6 text-[10px] leading-relaxed text-[#777168]" data-testid="text-price-note">Harga dan durasi mengikuti menu studio. Semua layanan diawali dengan konsultasi singkat.</p>
        </div>
      </section>

      <section id="ruang" className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-24 md:grid-cols-[1fr_1fr] md:gap-20 md:px-10 md:py-36">
        <div className="media-frame grain relative aspect-[1.08] overflow-hidden bg-[#1d1715]">
          {site?.heroImageUrl ? <img src={site.heroImageUrl} alt="Suasana dan karakter studio GGS" className="media-image h-full w-full object-cover opacity-75" data-testid="img-studio-api" /> : <img src="/ggs-editorial.jpg" alt="Detail editorial berwarna di ruang studio bernuansa gelap" className="media-image h-full w-full object-cover opacity-75" data-testid="img-studio-editorial" />}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0c0b0a]/70 via-transparent to-[#dd5c97]/10" />
          <span className="absolute bottom-6 left-6 eyebrow text-[9px]">SLOW DOWN. TUNE IN.</span>
          <span className="absolute right-5 top-5 font-display text-[58px] italic leading-none text-white/80">G.</span>
        </div>
        <div className="max-w-[490px]">
          <span className="eyebrow" data-testid="text-space-overline">RUANG YANG MENDENGARKAN</span>
          <h2 className="mt-6 font-display text-[clamp(3.5rem,6vw,6.1rem)] leading-[.85] tracking-[-.04em]">Tenang di<br />luar. <i className="fusion-text">Bebas</i><br />di dalam.</h2>
          <p className="mt-7 text-[14px] leading-[1.9] text-[#aaa398]">Kami menjaga ruang ini tetap intim, hangat, dan tanpa terburu-buru. Musik pelan. Percakapan jujur. Kursi yang hanya untukmu.</p>
          <a href="#kunjungi" className="mt-8 inline-flex items-center gap-4 border-b border-[#d4b56f]/50 pb-3 text-[10px] tracking-[.15em] text-[#d4b56f] hover:border-[#d4b56f]" data-testid="link-find-studio">TEMUKAN KAMI <ArrowRight size={14} /></a>
        </div>
      </section>

      <section id="booking" className="relative border-y border-[#d4b56f]/20 bg-[#11100e]">
        <div className="absolute inset-y-0 right-0 hidden w-[34%] overflow-hidden md:block" aria-hidden="true"><div className="absolute -right-32 top-10 size-[450px] rounded-full border border-[#d4b56f]/10" /><div className="absolute -right-16 top-24 size-[320px] rounded-full border border-[#d4b56f]/10" /><div className="absolute right-0 top-40 size-[180px] rounded-full bg-[radial-gradient(circle,rgba(218,79,155,.12),transparent_70%)]" /></div>
        <div className="relative mx-auto grid max-w-[1360px] gap-12 px-5 py-24 md:grid-cols-[.8fr_1.2fr] md:gap-20 md:px-10 md:py-32">
          <div className="max-w-[430px]">
            <span className="eyebrow" data-testid="text-booking-overline">LANGKAH PERTAMA</span>
            <h2 className="mt-6 font-display text-[clamp(3.5rem,6vw,6.3rem)] leading-[.85] tracking-[-.04em]">Ayo mulai<br /><i className="text-[#d4b56f]">dari sini.</i></h2>
            <p className="mt-7 text-[14px] leading-[1.9] text-[#aaa398]">Ceritakan apa yang kamu cari. Kami akan menghubungimu untuk memastikan waktu dan detail janji temu.</p>
            <div className="mt-10 border-l border-[#d4b56f]/50 pl-5">
              <p className="font-display text-[24px] italic leading-snug">“Apa pun yang kamu bayangkan, kita mulai dengan mendengarkan.”</p>
              <p className="mt-3 font-mono text-[9px] tracking-[.14em] text-[#8e877c]">TIM GGS</p>
            </div>
          </div>
          <div className="max-w-[700px]">
            {submitted && appointment.data ? <div role="status" className="border border-[#d4b56f]/45 bg-[#191711] p-7 md:p-10" data-testid="status-booking-success">
              <span className="grid size-12 place-items-center rounded-full border border-[#d4b56f]/55 text-[#d4b56f]"><Check size={21} /></span>
              <p className="eyebrow mt-7">PERMINTAAN TERCATAT</p>
              <h3 className="mt-3 font-display text-[36px] leading-tight md:text-[42px]">Terima kasih, {appointment.data.customerName}.</h3>
              <p className="mt-3 max-w-[470px] text-[13px] leading-[1.8] text-[#aaa398]">Permintaan untuk <strong className="font-medium text-[#eee9de]">{appointment.data.serviceName}</strong> pada <strong className="font-medium text-[#eee9de]">{new Date(`${appointment.data.appointmentDate}T${appointment.data.appointmentTime}`).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</strong> sudah kami terima. Tim kami akan menghubungimu untuk konfirmasi.</p>
              <p className="mt-5 font-mono text-[10px] text-[#d4b56f]" data-testid="text-appointment-reference">REFERENSI #{appointment.data.id} · STATUS {appointment.data.status.toUpperCase()}</p>
              <button type="button" className="btn-outline mt-7 px-5 py-3 text-[10px] tracking-widest" onClick={() => { setSubmitted(false); appointment.reset(); }} data-testid="button-new-booking">BUAT PERMINTAAN LAIN</button>
            </div> : <form className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2" onSubmit={handleSubmit} data-testid="form-appointment">
              <label className="block text-[10px] tracking-[.08em] text-[#c8c0b3]">NAMA LENGKAP
                <input className="input-field mt-2" autoComplete="name" minLength={2} maxLength={120} required value={fields.customerName} onChange={(event) => setField('customerName', event.target.value)} placeholder="Nama yang ingin kami panggil" data-testid="input-customer-name" />
              </label>
              <label className="block text-[10px] tracking-[.08em] text-[#c8c0b3]">NOMOR TELEPON
                <input className="input-field mt-2" type="tel" autoComplete="tel" minLength={7} maxLength={40} required value={fields.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="+62 812 3456 7890" data-testid="input-customer-phone" />
              </label>
              <label className="block text-[10px] tracking-[.08em] text-[#c8c0b3] sm:col-span-2">ALAMAT EMAIL
                <input className="input-field mt-2" type="email" autoComplete="email" maxLength={254} required value={fields.email} onChange={(event) => setField('email', event.target.value)} placeholder="nama@email.com" data-testid="input-customer-email" />
              </label>
              <label className="block text-[10px] tracking-[.08em] text-[#c8c0b3] sm:col-span-2">PILIH LAYANAN
                <select className="input-field mt-2 appearance-none" required value={fields.serviceId} onChange={(event) => setField('serviceId', event.target.value)} disabled={services.length === 0} data-testid="select-service">
                  <option value="" disabled>{servicesQuery.isLoading ? 'Memuat pilihan layanan…' : services.length ? 'Pilih layanan yang kamu inginkan' : 'Layanan belum tersedia'}</option>
                  {services.map((service) => <option value={service.id} key={service.id}>{service.name} — Rp{new Intl.NumberFormat('id-ID').format(service.price)} · {service.durationMinutes} menit</option>)}
                </select>
              </label>
              <label className="block text-[10px] tracking-[.08em] text-[#c8c0b3]">TANGGAL PILIHAN
                <input className="input-field mt-2 [color-scheme:dark]" type="date" min={today} required value={fields.appointmentDate} onChange={(event) => setField('appointmentDate', event.target.value)} data-testid="input-appointment-date" />
              </label>
              <label className="block text-[10px] tracking-[.08em] text-[#c8c0b3]">JAM PILIHAN
                <input className="input-field mt-2 [color-scheme:dark]" type="time" required value={fields.appointmentTime} onChange={(event) => setField('appointmentTime', event.target.value)} data-testid="input-appointment-time" />
              </label>
              <label className="block text-[10px] tracking-[.08em] text-[#c8c0b3] sm:col-span-2">ADA YANG INGIN KAMI TAHU? <span className="text-[#7c756b]">(OPSIONAL)</span>
                <textarea className="input-field mt-2 min-h-[100px] resize-y" maxLength={600} value={fields.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Ceritakan sedikit tentang rambut atau inspirasimu…" data-testid="input-appointment-notes" />
              </label>
              {appointment.isError && <p role="alert" className="border border-red-400/30 bg-red-400/5 p-4 text-[12px] leading-relaxed text-[#e5a39c] sm:col-span-2" data-testid="status-booking-error">Permintaan belum berhasil dikirim. Periksa kembali koneksi dan coba lagi. Data formulir tetap tersimpan.</p>}
              <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-[270px] text-[10px] leading-relaxed text-[#80796f]">Ini adalah permintaan janji temu, bukan konfirmasi slot otomatis.</p>
                <button type="submit" disabled={appointment.isPending || services.length === 0} className="btn-gold inline-flex items-center justify-center gap-4 px-7 py-[17px] text-[10px] font-semibold tracking-[.13em] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-submit-appointment">
                  {appointment.isPending ? 'MENGIRIM PERMINTAAN…' : 'KIRIM PERMINTAAN'} {appointment.isPending ? <span className="size-3 animate-pulse rounded-full bg-[#17130b]" /> : <ArrowRight size={15} />}
                </button>
              </div>
            </form>}
          </div>
        </div>
      </section>

      <section id="kunjungi" className="mx-auto max-w-[1440px] px-5 py-24 md:px-10 md:py-32">
        <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><span className="eyebrow" data-testid="text-visit-overline">NANTI KITA BERTEMU</span><h2 className="mt-5 font-display text-[clamp(3rem,6vw,5.5rem)] leading-[.9]">Datang sebagai<br /><i className="text-[#d4b56f]">dirimu sendiri.</i></h2></div>
          <p className="max-w-[300px] text-[12px] leading-[1.85] text-[#aaa398]">Pintu studio terbuka untuk obrolan yang baik, secangkir teh, dan rambut yang terasa lebih kamu.</p>
        </div>
        {siteQuery.isError ? <div role="alert" className="mb-7 border border-[#d4b56f]/25 bg-[#141210] p-5 text-[12px] text-[#aaa398]" data-testid="status-site-error"><span className="text-[#d4b56f]">Detail studio belum dapat dimuat.</span> Coba lagi untuk melihat alamat dan jam terbaru. <button type="button" className="ml-2 underline underline-offset-4" onClick={() => siteQuery.refetch()} data-testid="button-retry-site">Muat ulang</button></div> :
          siteQuery.isLoading ? <div className="mb-7 h-16 animate-pulse bg-white/[.04]" data-testid="status-site-loading" /> : null}
        <div className="grid border-y border-[#d4b56f]/20 sm:grid-cols-3">
          <article className="border-b border-[#d4b56f]/20 py-7 sm:border-b-0 sm:border-r sm:pr-7 md:py-9" data-testid="card-location-address">
            <span className="eyebrow flex items-center gap-2"><MapPin size={13} /> LOKASI</span>
            <p className="mt-5 max-w-[260px] text-[13px] leading-[1.8] text-[#d0c8bc]">{site?.address || (siteQuery.isLoading ? 'Memuat alamat studio…' : siteQuery.isError ? 'Alamat belum tersedia.' : 'Informasi alamat belum tersedia.')}</p>
            {site?.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-[9px] tracking-[.13em] text-[#d4b56f]" data-testid="link-map">BUKA PETA <ArrowUpRight size={12} /></a>}
          </article>
          <article className="border-b border-[#d4b56f]/20 py-7 sm:border-b-0 sm:border-r sm:px-7 md:py-9" data-testid="card-location-hours">
            <span className="eyebrow flex items-center gap-2"><Clock3 size={13} /> JAM STUDIO</span>
            <p className="mt-5 max-w-[280px] text-[13px] leading-[1.8] text-[#d0c8bc]">{site?.openingHours || (siteQuery.isLoading ? 'Memuat jam studio…' : siteQuery.isError ? 'Jam studio belum tersedia.' : 'Informasi jam belum tersedia.')}</p>
            <p className="mt-4 text-[10px] text-[#80796f]">Buat janji terlebih dahulu untuk waktu terbaik.</p>
          </article>
          <article className="py-7 sm:pl-7 md:py-9" data-testid="card-location-connect">
            <span className="eyebrow flex items-center gap-2"><Instagram size={13} /> TERHUBUNG</span>
            <p className="mt-5 text-[13px] leading-[1.8] text-[#d0c8bc]">Ada inspirasi atau pertanyaan? Kami senang mendengarnya.</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
              {site?.instagramHandle && <a href={`https://instagram.com/${site.instagramHandle.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[10px] text-[#d4b56f]" data-testid="link-instagram">{site.instagramHandle} <ArrowUpRight size={12} /></a>}
              {site?.phone && <a href={`tel:${site.phone.replace(/[^\d+]/g, '')}`} className="text-[10px] text-[#d4b56f]" data-testid="link-phone">{site.phone}</a>}
              {!site?.instagramHandle && !site?.phone && <span className="text-[10px] text-[#80796f]" data-testid="text-contact-unavailable">{siteQuery.isLoading ? 'Memuat kontak…' : 'Informasi kontak belum tersedia.'}</span>}
            </div>
          </article>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-[#d4b56f]/15 bg-[#141210] px-5 py-20 text-center md:py-28">
        <span className="eyebrow">SEBUAH CATATAN KECIL</span>
        <p className="mx-auto mt-6 max-w-[900px] font-display text-[clamp(2.4rem,5vw,5rem)] leading-[.98] tracking-[-.025em]">Tak perlu jadi orang lain untuk merasa <i className="fusion-text">baru.</i></p>
        <button type="button" className="btn-gold mt-9 inline-flex items-center gap-4 px-7 py-[16px] text-[10px] font-semibold tracking-[.13em]" onClick={() => goToBooking()} data-testid="button-book-bottom">BUAT JANJI DENGAN GGS <ArrowRight size={15} /></button>
        <div className="absolute -left-24 top-1/2 hidden size-64 -translate-y-1/2 rounded-full border border-[#d4b56f]/10 md:block" aria-hidden="true" />
        <div className="absolute -right-24 top-1/2 hidden size-64 -translate-y-1/2 rounded-full border border-[#d4b56f]/10 md:block" aria-hidden="true" />
      </section>

      <footer className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 px-5 py-7 sm:flex-row sm:items-center md:px-10" data-testid="footer-site">
        <a href="#beranda" className="flex items-center gap-3" data-testid="link-footer-home"><span className="font-display text-[27px] text-[#d4b56f]">G.</span><span className="text-[11px] font-semibold tracking-[.2em]">GGS HAIR STUDIO</span></a>
        <p className="text-[9px] tracking-[.08em] text-[#777168]">INDEPENDEN. PERSONAL. SELALU TENTANG KAMU.</p>
        <a href="#beranda" className="text-[9px] tracking-[.12em] text-[#aaa398] hover:text-[#d4b56f]" data-testid="link-back-top">KEMBALI KE ATAS ↑</a>
      </footer>
    </main>
  );
}

export default App;
