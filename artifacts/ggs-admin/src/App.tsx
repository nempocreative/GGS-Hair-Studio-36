import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  getGetGgsAdminAppointmentsQueryKey,
  getGetGgsAdminProductsQueryKey,
  getGetGgsPublicProductsQueryKey,
  getGetGgsAdminServicesQueryKey,
  getGetGgsAdminSummaryQueryKey,
  getGetGgsSiteQueryKey,
  useCreateGgsService,
  useCreateGgsProduct,
  useDeleteGgsService,
  useDeleteGgsProduct,
  useGetGgsAdminAppointments,
  useGetGgsAdminProducts,
  useGetGgsAdminServices,
  useGetGgsAdminSummary,
  useGetGgsSite,
  useUpdateGgsAppointment,
  useUpdateGgsService,
  useUpdateGgsProduct,
  useUpdateGgsSite,
  type GgsAppointment,
  type GgsAppointmentStatus,
  type GgsService,
  type GgsServiceInput,
  type GgsProduct,
  type GgsProductInput,
  type GgsSiteContent,
} from '@workspace/api-client-react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown,
  Clock3, ExternalLink, Instagram, LayoutDashboard, LogOut, Menu, Pencil,
  Plus, Scissors, Settings2, ShieldAlert, Sparkles, Trash2, X, ShoppingBag,
} from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const queryClient = new QueryClient();

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');

const appearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#d4b56f',
    colorForeground: '#eee9de',
    colorMutedForeground: '#a49d90',
    colorDanger: '#e36a61',
    colorBackground: '#141210',
    colorInput: '#0e0d0b',
    colorInputForeground: '#eee9de',
    colorNeutral: '#39352e',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '2px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#141210] border border-[#39352e] rounded-sm w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#eee9de] font-display text-4xl',
    headerSubtitle: 'text-[#a49d90]',
    socialButtonsBlockButtonText: 'text-[#eee9de] font-medium',
    formFieldLabel: 'text-[#eee9de] font-medium',
    footerActionLink: 'text-[#d4b56f] hover:text-[#f1d99e]',
    footerActionText: 'text-[#a49d90]',
    dividerText: 'text-[#a49d90]',
    identityPreviewEditButton: 'text-[#d4b56f]',
    formFieldSuccessText: 'text-emerald-300',
    alertText: 'text-[#eee9de]',
    logoBox: 'mb-5',
    logoImage: 'max-h-10',
    socialButtonsBlockButton: 'border border-[#39352e] bg-[#0e0d0b] hover:bg-[#1d1a16]',
    formButtonPrimary: 'bg-[#d4b56f] text-[#17130b] hover:bg-[#e8cf91] shadow-none',
    formFieldInput: 'border-[#39352e] bg-[#0e0d0b] text-[#eee9de] focus:border-[#d4b56f]',
    footerAction: 'border-t border-[#39352e]',
    dividerLine: 'bg-[#39352e]',
    alert: 'border-[#75463e] bg-[#281816]',
    otpCodeFieldInput: 'border-[#39352e] bg-[#0e0d0b] text-[#eee9de]',
    formFieldRow: 'mb-4',
    main: 'text-[#eee9de]',
  },
};

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; kicker: string };
const navItems: NavItem[] = [
  { label: 'Ringkasan', href: '/', icon: LayoutDashboard, kicker: '01' },
  { label: 'Janji temu', href: '/appointments', icon: CalendarDays, kicker: '02' },
  { label: 'Layanan', href: '/services', icon: Scissors, kicker: '03' },
  { label: 'Konten situs', href: '/site', icon: Settings2, kicker: '04' },
  { label: 'Produk', href: '/products', icon: ShoppingBag, kicker: '05' },
];

function AuthPage({ mode }: { mode: 'in' | 'up' }) {
  return (
    <main className="auth-page grain">
      <div className="auth-photo" />
      <div className="auth-copy">
        <Link href="/" className="brand-lockup"><span className="brand-mark">G</span><span>GGS <i>Hair Studio</i></span></Link>
        <div className="auth-note">
          <span className="eyebrow">RUANG KHUSUS PEMILIK</span>
          <h1 className="font-display">Studio ini,<br /><em>dalam kendali Anda.</em></h1>
          <p>Kelola janji temu, layanan, dan cerita GGS dalam satu ruang yang dirancang khusus untuk Anda.</p>
        </div>
        <p className="auth-foot">GGS HAIR STUDIO <span>—</span> ADMIN PEMILIK</p>
      </div>
      <div className="auth-form-wrap">
        {mode === 'in'
          ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
          : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />}
      </div>
    </main>
  );
}

function Landing() {
  const { isLoaded, isSignedIn } = useUser();
  if (isLoaded && isSignedIn) return <Redirect to="/" />;
  return (
    <main className="landing grain">
      <header className="landing-top"><Link href="/" className="brand-lockup"><span className="brand-mark">G</span><span>GGS <i>Hair Studio</i></span></Link><span className="eyebrow">PORTAL KHUSUS PEMILIK</span></header>
      <div className="landing-content">
        <div className="landing-image"><img src={`${basePath}/ggs-editorial.jpg`} alt="Potret editorial GGS Hair Studio" /><span className="image-caption">RUANG UNTUK MENJADI DIRI SENDIRI.</span></div>
        <section className="landing-text">
          <span className="eyebrow">AKSES KHUSUS PEMILIK</span>
          <h1 className="font-display">Rambut indah.<br /><em>Energi baik.</em></h1>
          <p>Atur hal-hal kecil yang membuat setiap kunjungan terasa khas GGS. Kelola janji temu, layanan, dan cerita studio yang tampil di situs.</p>
          <div className="landing-actions"><Link href="/sign-in" className="button button-gold">Masuk ke studio <ArrowRight size={16} /></Link><Link href="/sign-up" className="text-link">Buat akun pemilik <ArrowUpRight size={14} /></Link></div>
          <div className="landing-rule"><span>01 — JANJI TEMU</span><span>02 — LAYANAN</span><span>03 — CERITA STUDIO</span></div>
        </section>
      </div>
      <footer className="landing-bottom"><span>GGS HAIR STUDIO</span><span>KARYA ANDA, CARA ANDA.</span></footer>
    </main>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Selamat datang kembali', subtitle: 'Masuk ke ruang pengelolaan studio Anda', actionText: 'Belum memiliki akun?', actionLink: 'Daftar sebagai pemilik' } },
        signUp: { start: { title: 'Buat akun pemilik', subtitle: 'Akses pemilik tetap diverifikasi oleh GGS', actionText: 'Sudah memiliki akun?', actionLink: 'Masuk' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkCacheInvalidator />
      <Switch>
        <Route path="/sign-in/*?" component={() => <AuthPage mode="in" />} />
        <Route path="/sign-up/*?" component={() => <AuthPage mode="up" />} />
        <Route path="/" component={RootDashboard} />
        <Route path="/site" component={ProtectedSite} />
        <Route path="/services" component={ProtectedServices} />
        <Route path="/products" component={ProtectedProducts} />
        <Route path="/appointments" component={ProtectedAppointments} />
        <Route path="/dashboard" component={() => <Redirect to="/" />} />
        <Route component={NotFound} />
      </Switch>
    </ClerkProvider>
  );
}

function NotFound() {
  return <main className="not-found"><span className="eyebrow">404 / HALAMAN TIDAK DITEMUKAN</span><h1 className="font-display">Halaman ini tidak tersedia.</h1><Link className="button button-outline" href="/">Kembali ke ringkasan</Link></main>;
}

function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <LoadingScreen label="Memeriksa akses studio…" />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <AdminShell>{children}</AdminShell>;
}
function ProtectedSite() { return <Protected><SitePage /></Protected>; }
function ProtectedServices() { return <Protected><ServicesPage /></Protected>; }
function ProtectedProducts() { return <Protected><ProductsPage /></Protected>; }
function ProtectedAppointments() { return <Protected><AppointmentsPage /></Protected>; }

function AdminShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const initial = user?.firstName?.slice(0, 1) || 'G';
  return (
    <div className="admin-frame grain">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><Link href="/" className="brand-lockup"><span className="brand-mark">G</span><span>GGS <i>Hair Studio</i></span></Link><button className="mobile-close icon-button" onClick={() => setOpen(false)} aria-label="Tutup navigasi"><X size={18} /></button></div>
        <div className="sidebar-context"><span className="eyebrow">RUANG PENGELOLAAN</span><span className="context-name">Meja pemilik</span></div>
        <nav className="side-nav" aria-label="Navigasi utama">
          <span className="nav-label">KELOLA</span>
          {navItems.map(({ label, href, icon: Icon, kicker }) => {
            const active = href === '/' ? location === '/' : location.startsWith(href);
            return <Link key={href} href={href} onClick={() => setOpen(false)} className={`side-link ${active ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><span className="side-number">{kicker}</span><Icon size={17} strokeWidth={1.6} /><span>{label}</span>{active && <span className="active-pip" />}</Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer" className="public-link"><ExternalLink size={14} /> Situs publik <ArrowUpRight size={12} /></a>
          <div className="owner-chip"><span className="owner-avatar">{initial}</span><span className="owner-meta"><b>{user?.firstName || 'Pemilik studio'}</b><small>AKSES PEMILIK</small></span><button className="logout-button" onClick={() => signOut({ redirectUrl: basePath || '/' })} aria-label="Keluar"><LogOut size={15} /></button></div>
        </div>
      </aside>
      {open && <button className="mobile-scrim" aria-label="Tutup navigasi" onClick={() => setOpen(false)} />}
      <section className="workspace">
        <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setOpen(true)} aria-label="Buka navigasi"><Menu size={20} /></button><div className="breadcrumb"><span>GGS</span><span className="crumb-slash">/</span><b>{navItems.find((item) => item.href === location || (item.href !== '/' && location.startsWith(item.href)))?.label || 'Ringkasan'}</b></div><div className="topbar-right"><span className="live-mark"><i /> STUDIO AKTIF</span><span className="top-date">{new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date())}</span></div></header>
        <main className="page-content page-enter">{children}</main>
      </section>
    </div>
  );
}

function LoadingScreen({ label = 'Memuat data studio…' }: { label?: string }) {
  return <div className="screen-loading"><span className="loading-mark">G</span><span>{label}</span><div className="loading-line" /></div>;
}
function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="skeleton-stack" aria-label="Memuat"><div className="skeleton wide" />{Array.from({ length: rows }, (_, i) => <div className="skeleton" key={i} />)}</div>;
}
function ErrorState({ onRetry, title = 'Koneksi studio sedang bermasalah.' }: { onRetry: () => void; title?: string }) {
  return <div className="state-card error-state"><span className="state-icon"><ShieldAlert size={20} /></span><h3>{title}</h3><p>Tidak ada perubahan yang tersimpan. Silakan coba lagi sebentar.</p><button className="button button-outline" onClick={onRetry}>Coba lagi <ArrowRight size={14} /></button></div>;
}
function AccessDenied() {
  return <div className="state-card denied-state"><span className="state-icon"><ShieldAlert size={20} /></span><span className="eyebrow">VERIFIKASI PEMILIK DIPERLUKAN</span><h2 className="font-display">Ruang ini khusus pemilik.</h2><p>Akun ini tidak memiliki akses pemilik ke data studio GGS. Jika Anda merasa ini keliru, keluar lalu masuk menggunakan akun pemilik studio.</p></div>;
}
function isForbidden(error: unknown) {
  return typeof error === 'object' && error !== null && 'status' in error && [401, 403].includes((error as { status?: number }).status ?? 0);
}
function QueryFailure({ error, retry }: { error: unknown; retry: () => void }) {
  return isForbidden(error) ? <AccessDenied /> : <ErrorState onRetry={retry} />;
}
function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: ReactNode; detail: string; action?: ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1 className="font-display">{title}</h1><p>{detail}</p></div>{action}</div>;
}
function Metric({ label, value, unit, icon: Icon, accent, note }: { label: string; value: string | number; unit?: string; icon: typeof CalendarDays; accent?: boolean; note: string }) {
  return <article className={`metric-card ${accent ? 'metric-accent' : ''}`}><div className="metric-top"><span className="eyebrow">{label}</span><span className="metric-icon"><Icon size={17} strokeWidth={1.5} /></span></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-note">{note}</div></article>;
}
function money(value: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value); }
function niceDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function DashboardPage() {
  const query = useGetGgsAdminSummary({ query: { queryKey: getGetGgsAdminSummaryQueryKey(), refetchOnMount: 'always', staleTime: 20_000 } });
  const appointments = useGetGgsAdminAppointments({ query: { queryKey: getGetGgsAdminAppointmentsQueryKey(), refetchOnMount: 'always', staleTime: 20_000 } });
  const summary = query.data;
  return <div className="dashboard-page">
    <PageHeading eyebrow="DENYUT STUDIO · RINGKASAN" title={<>Hari yang baik<br /><em>dimulai di sini.</em></>} detail="Kabar terbaru studio Anda, tersaji dalam satu tampilan." action={<Link href="/appointments" className="button button-outline">Tinjau janji temu <ArrowRight size={15} /></Link>} />
    {query.isLoading ? <div className="metric-grid">{Array.from({ length: 5 }, (_, i) => <div className="metric-card" key={i}><Skeleton rows={1} /></div>)}</div> : query.isError ? <QueryFailure error={query.error} retry={() => void query.refetch()} /> : summary ? <>
      <section className="metric-grid" aria-label="Ringkasan studio">
        <Metric label="Total janji temu" value={summary.totalAppointments} icon={CalendarDays} note="Semua permintaan yang masuk" />
        <Metric label="Menunggu konfirmasi" value={summary.pendingAppointments} icon={Clock3} accent note="Perlu ditinjau" />
        <Metric label="Terkonfirmasi" value={summary.confirmedAppointments} icon={Check} note="Sudah masuk jadwal studio" />
        <Metric label="Layanan aktif" value={summary.activeServices} icon={Scissors} note="Tampil di situs publik" />
        <Metric label="Pendapatan bulan ini" value={money(summary.monthlyRevenue)} icon={ArrowUpRight} note="Dari layanan yang selesai" />
      </section>
      <section className="dash-lower">
        <div className="panel upcoming-panel">
          <div className="panel-heading"><div><span className="eyebrow">BUKU JANJI TEMU</span><h2 className="font-display">Permintaan terbaru</h2></div><Link href="/appointments" className="quiet-link">Buka buku <ArrowRight size={14} /></Link></div>
          {appointments.isLoading ? <Skeleton rows={4} /> : appointments.isError ? <QueryFailure error={appointments.error} retry={() => void appointments.refetch()} /> : appointments.data?.length ? <div className="latest-list">{appointments.data.slice(0, 5).map((item) => <AppointmentMini key={item.id} item={item} />)}</div> : <EmptyState icon={<CalendarDays size={20} />} title="Buku janji temu siap diisi." body="Permintaan janji temu baru akan muncul di sini." />}
        </div>
        <aside className="editorial-card">
          <div className="editorial-image"><img src={`${basePath}/ggs-editorial.jpg`} alt="Potret editorial GGS" /><span className="editorial-stamp">GGS<br />STUDIO</span></div>
          <div className="editorial-copy"><span className="eyebrow">CATATAN DARI STUDIO</span><h3 className="font-display">Studio Anda.<br /><em>Cara Anda.</em></h3><p>Perbarui layanan dan cerita studio agar tetap terasa khas GGS.</p><Link href="/services" className="text-link">Atur daftar layanan <ArrowUpRight size={14} /></Link></div>
        </aside>
      </section>
      <div className="dashboard-footer"><span><Sparkles size={13} /> HAL KECIL YANG TERASA KHAS GGS</span><Link href="/site">Perbarui cerita studio <ArrowRight size={13} /></Link></div>
    </> : null}
  </div>;
}
function AppointmentMini({ item }: { item: GgsAppointment }) {
  return <div className="latest-row"><span className="date-tile"><b>{new Date(item.appointmentDate).getDate() || '—'}</b><small>{new Date(item.appointmentDate).toLocaleString('id-ID', { month: 'short' })}</small></span><div className="latest-person"><b>{item.customerName}</b><small>{item.serviceName} · {item.appointmentTime}</small></div><StatusPill status={item.status} /></div>;
}
function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3 className="font-display">{title}</h3><p>{body}</p>{action}</div>;
}

type SiteForm = {
  brandName: string; tagline: string; introduction: string; phone: string; address: string;
  openingHours: string; instagramHandle: string; heroImageUrl: string;
};
const blankSite: SiteForm = { brandName: '', tagline: '', introduction: '', phone: '', address: '', openingHours: '', instagramHandle: '', heroImageUrl: '' };
function SitePage() {
  const query = useGetGgsSite({ query: { queryKey: getGetGgsSiteQueryKey(), refetchOnMount: 'always', staleTime: 20_000 } });
  const mutation = useUpdateGgsSite();
  const client = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<SiteForm>(blankSite);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (query.data && !initialized) {
      const site: GgsSiteContent = query.data;
      setForm({ brandName: site.brandName, tagline: site.tagline, introduction: site.introduction, phone: site.phone, address: site.address, openingHours: site.openingHours, instagramHandle: site.instagramHandle, heroImageUrl: site.heroImageUrl || '' });
      setInitialized(true);
    }
  }, [query.data, initialized]);
  const set = (key: keyof SiteForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({ data: { ...form, heroImageUrl: form.heroImageUrl || null } }, {
      onSuccess: (site) => {
        client.setQueryData(getGetGgsSiteQueryKey(), site);
        void client.invalidateQueries({ queryKey: getGetGgsSiteQueryKey() });
        toast({ title: 'Cerita studio tersimpan', description: 'Informasi publik GGS telah diperbarui.' });
      },
      onError: (error) => toast({ title: isForbidden(error) ? 'Akses pemilik diperlukan' : 'Perubahan belum tersimpan', description: isForbidden(error) ? 'Akun ini tidak dapat mengubah konten GGS.' : 'Periksa kembali isian lalu coba lagi.', variant: 'destructive' }),
    });
  };
  if (query.isLoading) return <><PageHeading eyebrow="INFORMASI UNTUK PUBLIK" title="Cerita studio." detail="Beberapa kata dan detail kecil membuat kunjungan terasa akrab." /><Skeleton rows={7} /></>;
  if (query.isError) return <><PageHeading eyebrow="INFORMASI UNTUK PUBLIK" title="Cerita studio." detail="Beberapa kata dan detail kecil membuat kunjungan terasa akrab." /><QueryFailure error={query.error} retry={() => void query.refetch()} /></>;
  return <div className="site-page">
    <PageHeading eyebrow="INFORMASI UNTUK PUBLIK" title={<>Cerita<br /><em>studio.</em></>} detail="Informasi yang dilihat pengunjung saat mengenal GGS." />
    <div className="site-layout">
      <form className="panel form-panel site-form" onSubmit={submit}>
        <div className="panel-heading"><div><span className="eyebrow">01 — IDENTITAS & SUARA</span><h2 className="font-display">Tentukan nuansanya</h2></div><span className="form-step">01 / 02</span></div>
        <Field label="Nama studio" id="site-brand" hint="Maksimal 80 karakter"><input id="site-brand" data-testid="input-site-brand" required maxLength={80} value={form.brandName} onChange={(e) => set('brandName', e.target.value)} /></Field>
        <Field label="Tagline" id="site-tagline" hint="Kalimat yang mudah diingat"><input id="site-tagline" data-testid="input-site-tagline" maxLength={180} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Hari rambut indah, dengan cara Anda." /></Field>
        <Field label="Perkenalan studio" id="site-intro" hint={`${form.introduction.length} / 1.200`}><textarea id="site-intro" data-testid="input-site-introduction" maxLength={1200} rows={5} value={form.introduction} onChange={(e) => set('introduction', e.target.value)} placeholder="Ceritakan apa yang membuat GGS terasa istimewa." /></Field>
        <Field label="URL gambar utama" id="site-hero" hint="Opsional · tempel URL gambar lengkap"><input id="site-hero" data-testid="input-site-hero-image" type="url" value={form.heroImageUrl} onChange={(e) => set('heroImageUrl', e.target.value)} placeholder="https://" /></Field>
        <div className="form-divider"><span className="eyebrow">02 — TEMUKAN KAMI</span><span>Pastikan informasi selalu sesuai</span></div>
        <div className="form-two"><Field label="Nomor telepon" id="site-phone" hint="Tampil di situs publik"><input id="site-phone" data-testid="input-site-phone" type="tel" maxLength={40} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Masukkan nomor telepon studio" /></Field><Field label="Akun Instagram" id="site-instagram" hint="Tanpa tanda @"><input id="site-instagram" data-testid="input-site-instagram" maxLength={80} value={form.instagramHandle} onChange={(e) => set('instagramHandle', e.target.value.replace(/^@/, ''))} placeholder="akunstudio" /></Field></div>
        <Field label="Alamat studio" id="site-address" hint="Alamat yang dapat ditemukan pengunjung"><textarea id="site-address" data-testid="input-site-address" rows={2} maxLength={240} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Masukkan alamat studio" /></Field>
        <Field label="Jam operasional" id="site-hours" hint="Gunakan format yang mudah dibaca"><input id="site-hours" data-testid="input-site-hours" maxLength={180} value={form.openingHours} onChange={(e) => set('openingHours', e.target.value)} placeholder="Sel–Min · 10.00–19.00" /></Field>
        <div className="form-actions"><span>Perubahan langsung tampil setelah disimpan.</span><button className="button button-gold" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Menyimpan…' : 'Simpan detail studio'} <ArrowRight size={15} /></button></div>
      </form>
      <aside className="site-side">
        <div className="preview-card"><div className="preview-bar"><span className="eyebrow">PRATINJAU SITUS PUBLIK</span><span className="preview-dots"><i /><i /><i /></span></div><div className="preview-photo"><img src={form.heroImageUrl || `${basePath}/ggs-editorial.jpg`} alt="Pratinjau gambar utama GGS" /><span>GGS / HAIR STUDIO</span></div><div className="preview-copy"><span className="eyebrow">TENTANG STUDIO</span><h3 className="font-display">{form.tagline || 'Hari rambut indah, dengan cara Anda.'}</h3><p>{form.introduction || 'Perkenalan studio akan tampil di sini. Ceritakan hal yang membuat GGS terasa istimewa.'}</p><div className="preview-contact">{form.phone || 'Nomor telepon belum diisi'}<br />{form.address || 'Alamat studio belum diisi'}</div></div></div>
        <div className="notice-card"><span className="notice-icon"><Instagram size={16} /></span><div><b>Kontak dan alamat masih kosong.</b><p>Nomor kontak dan alamat studio sengaja dibiarkan kosong sampai Anda memasukkan informasi yang benar.</p></div></div>
      </aside>
    </div>
  </div>;
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: ReactNode }) {
  return <label className="field" htmlFor={id}><span className="field-head"><b>{label}</b>{hint && <small>{hint}</small>}</span>{children}</label>;
}

const emptyService: GgsServiceInput = { name: '', category: '', description: '', durationMinutes: 60, price: 0, active: true, imageUrl: null };
function ServicesPage() {
  const query = useGetGgsAdminServices({ query: { queryKey: getGetGgsAdminServicesQueryKey(), refetchOnMount: 'always', staleTime: 20_000 } });
  const [editing, setEditing] = useState<GgsService | null | 'new'>(null);
  const [search, setSearch] = useState('');
  const create = useCreateGgsService();
  const update = useUpdateGgsService();
  const remove = useDeleteGgsService();
  const client = useQueryClient();
  const { toast } = useToast();
  const saving = create.isPending || update.isPending;
  function saved() {
    void client.invalidateQueries({ queryKey: getGetGgsAdminServicesQueryKey() });
    void client.invalidateQueries({ queryKey: getGetGgsAdminSummaryQueryKey() });
  }
  const records = query.data?.filter((service) => `${service.name} ${service.category}`.toLowerCase().includes(search.toLowerCase())) || [];
  return <div className="services-page">
    <PageHeading eyebrow="DAFTAR LAYANAN" title={<>Atur nuansa<br /><em>kunjungan.</em></>} detail="Ritual dan detail yang menjadikan kunjungan terasa milik Anda." action={<button className="button button-gold" onClick={() => setEditing('new')} data-testid="button-add-service"><Plus size={16} /> Tambah layanan</button>} />
    <div className="example-notice"><span className="notice-spark"><Sparkles size={17} /></span><div><b>Daftar awal · data contoh</b><p>Layanan dan harga awal hanyalah contoh. Perbarui semua data sebelum dipublikasikan agar tamu melihat daftar layanan dan harga GGS yang sebenarnya.</p></div><span className="example-tag">PERLU DIPERBARUI</span></div>
    <div className="table-tools"><div className="table-count"><span className="eyebrow">DAFTAR LAYANAN</span><b>{query.data?.length ?? '—'} <small>layanan</small></b></div><label className="search-box"><span className="sr-only">Cari layanan</span><input data-testid="input-service-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari layanan…" /><span>/</span></label></div>
    {query.isLoading ? <div className="panel table-panel"><Skeleton rows={6} /></div> : query.isError ? <QueryFailure error={query.error} retry={() => void query.refetch()} /> : records.length ? <div className="panel table-panel"><table className="data-table service-table"><thead><tr><th>LAYANAN</th><th>KATEGORI</th><th>DURASI</th><th>HARGA</th><th>STATUS</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{records.map((service) => <tr key={service.id} data-testid={`row-service-${service.id}`}><td><div className="service-name-cell">{service.imageUrl ? <img src={service.imageUrl} alt="" /> : <span className="service-thumb"><Scissors size={15} /></span>}<span><b>{service.name}</b><small>{service.description || 'Deskripsi belum ditambahkan'}</small></span></div></td><td><span className="category-label">{service.category}</span></td><td>{service.durationMinutes} <small>mnt</small></td><td className="price-cell">{money(service.price)}</td><td><span className={`availability ${service.active ? 'available' : 'unavailable'}`}><i />{service.active ? 'Aktif' : 'Disembunyikan'}</span></td><td><div className="table-actions"><button className="icon-button" onClick={() => setEditing(service)} aria-label={`Ubah ${service.name}`} data-testid={`button-edit-service-${service.id}`}><Pencil size={15} /></button><button className="icon-button danger-icon" onClick={() => { if (window.confirm(`Hapus “${service.name}” dari daftar layanan?`)) remove.mutate({ id: service.id }, { onSuccess: () => { saved(); toast({ title: 'Layanan dihapus', description: `${service.name} telah dihapus dari daftar layanan.` }); }, onError: (error) => toast({ title: isForbidden(error) ? 'Akses pemilik diperlukan' : 'Layanan belum terhapus', description: 'Silakan coba lagi.', variant: 'destructive' }) }); }} disabled={remove.isPending} aria-label={`Hapus ${service.name}`} data-testid={`button-delete-service-${service.id}`}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon={<Scissors size={20} />} title={search ? 'Layanan tidak ditemukan.' : 'Daftar layanan siap disusun.'} body={search ? 'Coba nama atau kategori lain.' : 'Tambahkan layanan yang dapat dipesan oleh tamu GGS.'} action={!search && <button className="button button-gold" onClick={() => setEditing('new')}><Plus size={15} /> Tambahkan layanan pertama</button>} />}
    <div className="services-footnote"><span className="eyebrow">CATATAN KECIL</span><span>Layanan aktif akan tampil di situs publik GGS.</span><Link href="/site">Ubah cerita studio <ArrowUpRight size={13} /></Link></div>
    {editing && <ServiceDialog service={editing === 'new' ? null : editing} saving={saving} onClose={() => setEditing(null)} onSave={(input) => {
      const onSuccess = () => { saved(); setEditing(null); toast({ title: editing === 'new' ? 'Layanan ditambahkan' : 'Layanan diperbarui', description: 'Daftar layanan Anda telah diperbarui.' }); };
      const onError = (error: unknown) => toast({ title: isForbidden(error) ? 'Akses pemilik diperlukan' : 'Layanan belum tersimpan', description: 'Periksa detailnya lalu coba lagi.', variant: 'destructive' });
      if (editing === 'new') create.mutate({ data: input }, { onSuccess, onError });
      else update.mutate({ id: editing.id, data: input }, { onSuccess, onError });
    }} />}
  </div>;
}

function ServiceDialog({ service, saving, onClose, onSave }: { service: GgsService | null; saving: boolean; onClose: () => void; onSave: (input: GgsServiceInput) => void }) {
  const [form, setForm] = useState<GgsServiceInput>(() => service ? { name: service.name, category: service.category, description: service.description, durationMinutes: service.durationMinutes, price: service.price, active: service.active, imageUrl: service.imageUrl } : emptyService);
  const set = <K extends keyof GgsServiceInput>(key: K, value: GgsServiceInput[K]) => setForm((old) => ({ ...old, [key]: value }));
  function submit(event: FormEvent) { event.preventDefault(); onSave({ ...form, name: form.name.trim(), category: form.category.trim(), imageUrl: form.imageUrl || null }); }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="service-dialog" role="dialog" aria-modal="true" aria-labelledby="service-dialog-title"><div className="dialog-head"><div><span className="eyebrow">{service ? 'UBAH DAFTAR LAYANAN' : 'LAYANAN BARU'}</span><h2 className="font-display" id="service-dialog-title">{service ? 'Sempurnakan layanan.' : 'Tambahkan layanan.'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup dialog"><X size={18} /></button></div><form onSubmit={submit} className="dialog-form">
    <Field label="Nama layanan" id="service-name"><input id="service-name" data-testid="input-service-name" required maxLength={100} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Potong dan tata khas GGS" /></Field>
    <div className="form-two"><Field label="Kategori" id="service-category"><input id="service-category" data-testid="input-service-category" required maxLength={60} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Potong / Warna / Perawatan" /></Field><Field label="Durasi" id="service-duration"><div className="unit-input"><input id="service-duration" data-testid="input-service-duration" type="number" min={15} max={480} required value={form.durationMinutes} onChange={(e) => set('durationMinutes', Number(e.target.value))} /><span>MENIT</span></div></Field></div>
    <Field label="Deskripsi" id="service-description" hint={`${form.description.length} / 600`}><textarea id="service-description" data-testid="input-service-description" rows={3} maxLength={600} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Ceritakan sedikit tentang pengalaman ini…" /></Field>
    <div className="form-two"><Field label="Harga" id="service-price" hint="Rupiah Indonesia"><div className="unit-input"><span>RP</span><input id="service-price" data-testid="input-service-price" type="number" min={0} step={1000} required value={form.price} onChange={(e) => set('price', Number(e.target.value))} /></div></Field><Field label="URL gambar" id="service-image"><input id="service-image" data-testid="input-service-image" type="url" value={form.imageUrl || ''} onChange={(e) => set('imageUrl', e.target.value || null)} placeholder="Tautan gambar (opsional)" /></Field></div>
    <label className="toggle-row"><span><b>Tampilkan di daftar layanan</b><small>Tamu dapat melihat dan memesan layanan ini.</small></span><input type="checkbox" data-testid="input-service-active" checked={form.active} onChange={(e) => set('active', e.target.checked)} /><span className="toggle-ui" /></label>
    <div className="dialog-actions"><button type="button" className="button button-outline" onClick={onClose}>Batal</button><button type="submit" className="button button-gold" disabled={saving}>{saving ? 'Menyimpan…' : service ? 'Simpan perubahan' : 'Tambah layanan'} <ArrowRight size={15} /></button></div>
  </form></section></div>;
}

const emptyProduct: GgsProductInput = {
  name: '',
  category: '',
  description: '',
  price: 0,
  stock: 0,
  active: true,
  imageUrl: null,
};

function ProductsPage() {
  const query = useGetGgsAdminProducts({
    query: { queryKey: getGetGgsAdminProductsQueryKey(), refetchOnMount: 'always', staleTime: 20_000 },
  });
  const [editing, setEditing] = useState<GgsProduct | null | 'new'>(null);
  const [search, setSearch] = useState('');
  const create = useCreateGgsProduct();
  const update = useUpdateGgsProduct();
  const remove = useDeleteGgsProduct();
  const client = useQueryClient();
  const { toast } = useToast();
  const saving = create.isPending || update.isPending;
  function saved() {
    void client.invalidateQueries({ queryKey: getGetGgsAdminProductsQueryKey() });
    void client.invalidateQueries({ queryKey: getGetGgsPublicProductsQueryKey() });
  }
  const records = query.data?.filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase()),
  ) || [];

  return <div className="services-page">
    <PageHeading
      eyebrow="KATALOG PRODUK"
      title={<>Rawat rambut<br /><em>di rumah.</em></>}
      detail="Kelola produk yang tersedia untuk dilihat dan dimasukkan ke keranjang di situs GGS."
      action={<button className="button button-gold" onClick={() => setEditing('new')} data-testid="button-add-product"><Plus size={16} /> Tambah produk</button>}
    />
    <div className="table-tools">
      <div className="table-count"><span className="eyebrow">DAFTAR PRODUK</span><b>{query.data?.length ?? '—'} <small>produk</small></b></div>
      <label className="search-box"><span className="sr-only">Cari produk</span><input data-testid="input-product-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk…" /><span>/</span></label>
    </div>
    {query.isLoading ? <div className="panel table-panel"><Skeleton rows={5} /></div> :
      query.isError ? <QueryFailure error={query.error} retry={() => void query.refetch()} /> :
        records.length ? <div className="panel table-panel"><table className="data-table service-table product-table">
          <thead><tr><th>PRODUK</th><th>KATEGORI</th><th>STOK</th><th>HARGA</th><th>STATUS</th><th><span className="sr-only">Aksi</span></th></tr></thead>
          <tbody>{records.map((product) => <tr key={product.id} data-testid={`row-product-${product.id}`}>
            <td><div className="service-name-cell">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span className="service-thumb"><ShoppingBag size={15} /></span>}<span><b>{product.name}</b><small>{product.description || 'Deskripsi belum ditambahkan'}</small></span></div></td>
            <td><span className="category-label">{product.category || '—'}</span></td>
            <td>{product.stock} <small>unit</small></td>
            <td className="price-cell">{money(product.price)}</td>
            <td><span className={`availability ${product.active ? 'available' : 'unavailable'}`}><i />{product.active ? 'Aktif' : 'Disembunyikan'}</span></td>
            <td><div className="table-actions">
              <button className="icon-button" onClick={() => setEditing(product)} aria-label={`Ubah ${product.name}`} data-testid={`button-edit-product-${product.id}`}><Pencil size={15} /></button>
              <button className="icon-button danger-icon" onClick={() => { if (window.confirm(`Hapus “${product.name}” dari katalog?`)) remove.mutate({ id: product.id }, { onSuccess: () => { saved(); toast({ title: 'Produk dihapus', description: `${product.name} telah dihapus dari katalog.` }); }, onError: (error) => toast({ title: isForbidden(error) ? 'Akses pemilik diperlukan' : 'Produk belum terhapus', description: 'Silakan coba lagi.', variant: 'destructive' }) }); }} disabled={remove.isPending} aria-label={`Hapus ${product.name}`} data-testid={`button-delete-product-${product.id}`}><Trash2 size={15} /></button>
            </div></td>
          </tr>)}</tbody>
        </table></div> :
          <EmptyState icon={<ShoppingBag size={20} />} title={search ? 'Produk tidak ditemukan.' : 'Katalog produk masih kosong.'} body={search ? 'Coba nama atau kategori lain.' : 'Tambahkan produk dan harga sebenarnya agar pelanggan dapat melihatnya di situs.'} action={!search && <button className="button button-gold" onClick={() => setEditing('new')}><Plus size={15} /> Tambahkan produk pertama</button>} />}
    <div className="services-footnote"><span className="eyebrow">KATALOG PUBLIK</span><span>Produk aktif akan tampil di situs; stok 0 tetap terlihat sebagai habis.</span><Link href="/site">Atur detail studio <ArrowUpRight size={13} /></Link></div>
    {editing && <ProductDialog product={editing === 'new' ? null : editing} saving={saving} onClose={() => setEditing(null)} onSave={(input) => {
      const onSuccess = () => { saved(); setEditing(null); toast({ title: editing === 'new' ? 'Produk ditambahkan' : 'Produk diperbarui', description: 'Katalog produk GGS telah diperbarui.' }); };
      const onError = (error: unknown) => toast({ title: isForbidden(error) ? 'Akses pemilik diperlukan' : 'Produk belum tersimpan', description: 'Periksa detailnya lalu coba lagi.', variant: 'destructive' });
      if (editing === 'new') create.mutate({ data: input }, { onSuccess, onError });
      else update.mutate({ id: editing.id, data: input }, { onSuccess, onError });
    }} />}
  </div>;
}

function ProductDialog({ product, saving, onClose, onSave }: { product: GgsProduct | null; saving: boolean; onClose: () => void; onSave: (input: GgsProductInput) => void }) {
  const [form, setForm] = useState<GgsProductInput>(() => product ? {
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    stock: product.stock,
    active: product.active,
    imageUrl: product.imageUrl,
  } : emptyProduct);
  const set = <K extends keyof GgsProductInput>(key: K, value: GgsProductInput[K]) => setForm((old) => ({ ...old, [key]: value }));
  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({ ...form, name: form.name.trim(), category: form.category.trim(), imageUrl: form.imageUrl || null });
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="service-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
      <div className="dialog-head"><div><span className="eyebrow">{product ? 'UBAH KATALOG PRODUK' : 'PRODUK BARU'}</span><h2 className="font-display" id="product-dialog-title">{product ? 'Perbarui produk.' : 'Tambahkan produk.'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup dialog"><X size={18} /></button></div>
      <form onSubmit={submit} className="dialog-form">
        <Field label="Nama produk" id="product-name"><input id="product-name" data-testid="input-product-name" required maxLength={100} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nama sesuai kemasan" /></Field>
        <Field label="Kategori" id="product-category"><input id="product-category" data-testid="input-product-category" maxLength={60} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Perawatan / Styling" /></Field>
        <Field label="Deskripsi" id="product-description" hint={`${form.description.length} / 600`}><textarea id="product-description" data-testid="input-product-description" rows={3} maxLength={600} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Informasi produk yang sudah diverifikasi…" /></Field>
        <div className="form-two">
          <Field label="Harga" id="product-price" hint="Rupiah Indonesia"><div className="unit-input"><span>RP</span><input id="product-price" data-testid="input-product-price" type="number" min={0} step={1000} required value={form.price} onChange={(e) => set('price', Number(e.target.value))} /></div></Field>
          <Field label="Stok" id="product-stock"><div className="unit-input"><input id="product-stock" data-testid="input-product-stock" type="number" min={0} step={1} required value={form.stock} onChange={(e) => set('stock', Number(e.target.value))} /><span>UNIT</span></div></Field>
        </div>
        <Field label="URL foto produk" id="product-image" hint="Opsional"><input id="product-image" data-testid="input-product-image" type="url" value={form.imageUrl || ''} onChange={(e) => set('imageUrl', e.target.value || null)} placeholder="https://…" /></Field>
        <label className="toggle-row"><span><b>Tampilkan di katalog publik</b><small>Pelanggan dapat melihat produk aktif di situs.</small></span><input type="checkbox" data-testid="input-product-active" checked={form.active} onChange={(e) => set('active', e.target.checked)} /><span className="toggle-ui" /></label>
        <div className="dialog-actions"><button type="button" className="button button-outline" onClick={onClose}>Batal</button><button type="submit" className="button button-gold" disabled={saving}>{saving ? 'Menyimpan…' : product ? 'Simpan perubahan' : 'Tambah produk'} <ArrowRight size={15} /></button></div>
      </form>
    </section>
  </div>;
}

function AppointmentsPage() {
  const query = useGetGgsAdminAppointments({ query: { queryKey: getGetGgsAdminAppointmentsQueryKey(), refetchOnMount: 'always', staleTime: 15_000 } });
  const update = useUpdateGgsAppointment();
  const client = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | GgsAppointmentStatus>('all');
  const [search, setSearch] = useState('');
  const statuses: Array<'all' | GgsAppointmentStatus> = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
  const items = query.data?.filter((booking) => (filter === 'all' || booking.status === filter) && `${booking.customerName} ${booking.serviceName} ${booking.phone} ${booking.email}`.toLowerCase().includes(search.toLowerCase())) || [];
  function changeStatus(booking: GgsAppointment, status: GgsAppointmentStatus) {
    update.mutate({ id: booking.id, data: { status } }, {
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: getGetGgsAdminAppointmentsQueryKey() });
        void client.invalidateQueries({ queryKey: getGetGgsAdminSummaryQueryKey() });
        toast({ title: 'Status janji temu diperbarui', description: `Status ${booking.customerName} kini ${statusLabel(status).toLowerCase()}.` });
      },
      onError: (error) => toast({ title: isForbidden(error) ? 'Akses pemilik diperlukan' : 'Status belum diperbarui', description: 'Status janji temu tidak berubah.', variant: 'destructive' }),
    });
  }
  return <div className="appointments-page">
    <PageHeading eyebrow="BUKU JANJI TEMU" title={<>Setiap kunjungan,<br /><em>penuh perhatian.</em></>} detail="Tinjau permintaan dan jaga jadwal studio tetap tertata." />
    <section className="booking-toolbar"><div className="filter-tabs" role="tablist" aria-label="Saring janji temu">{statuses.map((status) => <button key={status} role="tab" aria-selected={filter === status} className={filter === status ? 'selected' : ''} onClick={() => setFilter(status)} data-testid={`filter-appointments-${status}`}>{status === 'all' ? 'Semua' : statusLabel(status)}<span>{status === 'all' ? query.data?.length ?? '—' : query.data?.filter((b) => b.status === status).length ?? '—'}</span></button>)}</div><label className="search-box booking-search"><span className="sr-only">Cari janji temu</span><input data-testid="input-appointment-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama, layanan, kontak…" /><span>/</span></label></section>
    {query.isLoading ? <div className="booking-cards">{Array.from({ length: 3 }, (_, i) => <div className="booking-card" key={i}><Skeleton rows={4} /></div>)}</div> : query.isError ? <QueryFailure error={query.error} retry={() => void query.refetch()} /> : items.length ? <div className="booking-list">{items.map((booking) => <BookingCard key={booking.id} booking={booking} saving={update.isPending} onStatus={(status) => changeStatus(booking, status)} />)}</div> : <EmptyState icon={<CalendarDays size={20} />} title={search || filter !== 'all' ? 'Tidak ada hasil di tampilan ini.' : 'Buku janji temu masih kosong.'} body={search || filter !== 'all' ? 'Coba filter atau kata pencarian lain.' : 'Permintaan baru dari tamu akan muncul di sini.'} />}
    <div className="booking-foot"><span className="eyebrow">PANDUAN STATUS</span><span><i className="status-dot pending-dot" /> Menunggu perlu ditinjau</span><span><i className="status-dot confirmed-dot" /> Dikonfirmasi masuk jadwal</span><span><i className="status-dot completed-dot" /> Selesai dihitung sebagai pendapatan</span></div>
  </div>;
}
function statusLabel(status: 'all' | GgsAppointmentStatus) {
  return ({ all: 'Semua', pending: 'Menunggu', confirmed: 'Dikonfirmasi', completed: 'Selesai', cancelled: 'Dibatalkan' } as const)[status];
}
function StatusPill({ status }: { status: GgsAppointmentStatus }) {
  return <span className={`status-pill status-${status}`} data-testid={`status-appointment-${status}`}><i />{statusLabel(status)}</span>;
}
function BookingCard({ booking, saving, onStatus }: { booking: GgsAppointment; saving: boolean; onStatus: (status: GgsAppointmentStatus) => void }) {
  const [expanded, setExpanded] = useState(false);
  const possible: GgsAppointmentStatus[] = booking.status === 'pending' ? ['confirmed', 'cancelled'] : booking.status === 'confirmed' ? ['completed', 'cancelled', 'pending'] : booking.status === 'completed' ? ['confirmed'] : ['pending', 'confirmed'];
  return <article className="booking-card" data-testid={`card-appointment-${booking.id}`}>
    <div className="booking-date"><span className="eyebrow">{niceDate(booking.appointmentDate).split(' ').slice(1).join(' ').toUpperCase()}</span><b className="font-display">{new Date(booking.appointmentDate).getDate() || '—'}</b><span className="booking-time"><Clock3 size={13} />{booking.appointmentTime}</span></div>
    <div className="booking-main"><div className="booking-title-line"><h3>{booking.customerName}</h3><StatusPill status={booking.status} /></div><div className="booking-service">{booking.serviceName} <span>·</span> Layanan #{booking.serviceId}</div><div className="booking-contact"><a href={`tel:${booking.phone}`}>{booking.phone}</a>{booking.email && <a href={`mailto:${booking.email}`}>{booking.email}</a>}</div>{booking.notes && <button className="notes-toggle" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Sembunyikan catatan' : 'Baca catatan tamu'} <ChevronDown size={13} className={expanded ? 'turned' : ''} /></button>}{expanded && booking.notes && <p className="guest-note">“{booking.notes}”</p>}</div>
    <div className="booking-actions"><span className="eyebrow">LANGKAH BERIKUTNYA</span><select aria-label={`Ubah status ${booking.customerName}`} data-testid={`select-status-${booking.id}`} value="" disabled={saving} onChange={(e) => { if (e.target.value) onStatus(e.target.value as GgsAppointmentStatus); }}><option value="">{saving ? 'Memperbarui…' : 'Ubah status'}</option>{possible.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><span className="booking-created">DIMINTA {niceDate(booking.createdAt).toUpperCase()}</span></div>
  </article>;
}

function RootDashboard() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <LoadingScreen label="Membuka ruang studio…" />;
  return isSignedIn ? <AdminShell><DashboardPage /></AdminShell> : <Landing />;
}

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUser = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previousUser.current !== undefined && previousUser.current !== id) client.clear();
    previousUser.current = id;
  }), [addListener, client]);
  return null;
}

function App() {
  return <QueryClientProvider client={queryClient}><div className="dark"><WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter><Toaster /></div></QueryClientProvider>;
}

export default App;
