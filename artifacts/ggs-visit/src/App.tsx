import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Clock3,
  Compass,
  Droplets,
  Gift,
  House,
  Instagram,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Scissors,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  getGetGgsPublicServicesQueryKey,
  getGetGgsSiteQueryKey,
  getGetGgsPublicProductsQueryKey,
  useCreateGgsAppointment,
  useGetGgsPublicProducts,
  useGetGgsPublicServices,
  useGetGgsSite,
} from '@workspace/api-client-react';
import type { GgsProduct, GgsService, GgsSiteContent } from '@workspace/api-client-react';
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

type HeaderPanel = 'notifications' | 'cart' | null;
type CartLine = { productId: number; quantity: number };

const cartStorageKey = 'ggs-product-cart';

function readStoredCart(): CartLine[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(cartStorageKey) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item): item is CartLine =>
      typeof item === 'object' &&
      item !== null &&
      Number.isInteger((item as CartLine).productId) &&
      Number.isInteger((item as CartLine).quantity) &&
      (item as CartLine).productId > 0 &&
      (item as CartLine).quantity > 0,
    );
  } catch {
    return [];
  }
}

const initialFields: BookingFields = {
  customerName: '',
  email: '',
  phone: '',
  serviceId: '',
  appointmentDate: '',
  appointmentTime: '',
  notes: '',
};

const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
const money = (amount: number) => `Rp${new Intl.NumberFormat('id-ID').format(amount)}`;

function App() {
  const siteQuery = useGetGgsSite({ query: { queryKey: getGetGgsSiteQueryKey() } });
  const servicesQuery = useGetGgsPublicServices({
    query: { queryKey: getGetGgsPublicServicesQueryKey() },
  });
  const productsQuery = useGetGgsPublicProducts({
    query: { queryKey: getGetGgsPublicProductsQueryKey() },
  });
  const appointment = useCreateGgsAppointment();
  const [location] = useLocation();
  const [headerPanel, setHeaderPanel] = useState<HeaderPanel>(null);
  const [cartItems, setCartItems] = useState<CartLine[]>(readStoredCart);
  const [fields, setFields] = useState<BookingFields>(initialFields);
  const [submitted, setSubmitted] = useState(false);
  const [selectedHairStyle, setSelectedHairStyle] = useState<string | null>(null);
  const [notesError, setNotesError] = useState('');
  const services = useMemo(
    () => servicesQuery.data?.filter((service) => service.active) ?? [],
    [servicesQuery.data],
  );
  const products = productsQuery.data ?? [];
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const site = siteQuery.data;

  useEffect(() => {
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
    } catch {
      // Keep the cart available for the current page session when storage is blocked.
    }
  }, [cartItems]);

  useEffect(() => {
    setHeaderPanel(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  useEffect(() => {
    if (!headerPanel) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHeaderPanel(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [headerPanel]);

  const updateField = (key: keyof BookingFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    if (key === 'notes') setNotesError('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(false);
    const selectedStyleNote = selectedHairStyle
      ? `Model rambut pilihan: ${selectedHairStyle}`
      : '';
    const notes = [fields.notes.trim(), selectedStyleNote].filter(Boolean).join('\n');
    if (notes.length > 600) {
      setNotesError('Persingkat catatan agar pilihan model rambut dapat disertakan.');
      return;
    }
    setNotesError('');
    appointment.mutate(
      {
        data: {
          customerName: fields.customerName.trim(),
          email: fields.email.trim(),
          phone: fields.phone.trim(),
          serviceId: Number(fields.serviceId),
          appointmentDate: fields.appointmentDate,
          appointmentTime: fields.appointmentTime,
          notes,
        },
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setFields(initialFields);
          setSelectedHairStyle(null);
        },
      },
    );
  };

  const openBooking = (serviceId?: number) => {
    if (serviceId) updateField('serviceId', String(serviceId));
  };

  const chooseHairStyle = (style: string) => {
    setSelectedHairStyle(style);
    setNotesError('');
  };

  const addProductToCart = (product: GgsProduct) => {
    if (!product.active || product.stock < 1) return;
    setCartItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (!existing) return [...current, { productId: product.id, quantity: 1 }];
      if (existing.quantity >= product.stock) return current;
      return current.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  };

  const changeCartQuantity = (productId: number, change: number) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setCartItems((current) => current.flatMap((item) => {
      if (item.productId !== productId) return [item];
      const quantity = item.quantity + change;
      if (quantity < 1) return [];
      const availableQuantity = Math.min(quantity, product.stock);
      return availableQuantity > 0 ? [{ ...item, quantity: availableQuantity }] : [];
    }));
  };

  const removeCartItem = (productId: number) =>
    setCartItems((current) => current.filter((item) => item.productId !== productId));

  const common = {
    services,
    servicesQuery,
    siteQuery,
    site,
    openBooking,
    products,
    productsQuery,
    cartItems,
    cartCount,
    addProductToCart,
    changeCartQuantity,
    removeCartItem,
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
        <div className="clearer-header-tools" aria-label="Notifikasi, keranjang, dan akun">
          <div className="clearer-header-tool">
            <button
              className="clearer-header-icon-button"
              type="button"
              aria-label="Notifikasi"
              aria-expanded={headerPanel === 'notifications'}
              aria-controls="header-notifications-panel"
              onClick={() => setHeaderPanel((current) => current === 'notifications' ? null : 'notifications')}
              data-testid="button-header-notifications"
            ><Bell size={19} strokeWidth={1.8} /></button>
            {headerPanel === 'notifications' && (
              <section className="clearer-header-popover" id="header-notifications-panel" aria-label="Notifikasi">
                <strong>Notifikasi</strong>
                <p>Belum ada notifikasi baru.</p>
              </section>
            )}
          </div>
          <div className="clearer-header-tool">
            <button
              className="clearer-header-icon-button"
              type="button"
              aria-label="Keranjang"
              aria-expanded={headerPanel === 'cart'}
              aria-controls="header-cart-panel"
              onClick={() => setHeaderPanel((current) => current === 'cart' ? null : 'cart')}
              data-testid="button-header-cart"
            ><ShoppingBag size={19} strokeWidth={1.8} />{cartCount > 0 && <span className="clearer-cart-count" aria-label={`${cartCount} produk di keranjang`}>{cartCount > 99 ? '99+' : cartCount}</span>}</button>
            {headerPanel === 'cart' && (
              <section className="clearer-header-popover" id="header-cart-panel" aria-label="Keranjang produk">
                <div className="clearer-cart-heading"><strong>Keranjang</strong><span>{cartCount} item</span></div>
                {productsQuery.isLoading ? <p>Memuat katalog produk…</p> :
                  productsQuery.isError ? <p role="alert">Katalog produk belum bisa dimuat.</p> :
                    cartItems.length ? <div className="clearer-cart-lines">
                      {cartItems.map((item) => {
                        const product = products.find((entry) => entry.id === item.productId);
                        return (
                          <article className="clearer-cart-line" key={item.productId}>
                            <div><b>{product?.name || 'Produk tidak lagi tersedia'}</b><small>{product ? money(product.price) : 'Hapus item ini dari keranjang'}</small></div>
                            <div className="clearer-cart-controls">
                              {product && <><button type="button" aria-label={`Kurangi ${product.name}`} onClick={() => changeCartQuantity(product.id, -1)}><Minus size={13} /></button><span>{item.quantity}</span><button type="button" aria-label={`Tambah ${product.name}`} disabled={item.quantity >= product.stock} onClick={() => changeCartQuantity(product.id, 1)}><Plus size={13} /></button></>}
                              <button type="button" aria-label={`Hapus ${product?.name || 'produk'} dari keranjang`} onClick={() => removeCartItem(item.productId)}>×</button>
                            </div>
                          </article>
                        );
                      })}
                      <div className="clearer-cart-subtotal"><span>Total sementara</span><strong>{money(cartItems.reduce((sum, item) => sum + (products.find((product) => product.id === item.productId)?.price || 0) * item.quantity, 0))}</strong></div>
                    </div> : <p>Keranjang masih kosong.</p>}
                <Link href="/products" className="clearer-cart-link">{cartItems.length ? 'Lihat katalog produk' : 'Jelajahi produk'} <ArrowRight size={14} /></Link>
                <small>Belum ada checkout atau pembayaran online.</small>
              </section>
            )}
          </div>
          <Link
            className="clearer-header-icon-button"
            href="/my-ggs"
            aria-label="Akun saya"
            title="Akun saya"
            data-testid="link-header-account"
          ><UserRound size={19} strokeWidth={1.8} /></Link>
        </div>
      </header>

      <Switch>
        <Route path="/">
          <HomePage {...common} />
        </Route>
        <Route path="/products">
          <ProductsPage {...common} />
        </Route>
        <Route path="/services">
          <ServicesPage />
        </Route>
        <Route path="/mens-grooming">
          <AudienceServicesPage {...common} audience="men" />
        </Route>
        <Route path="/womens-hair-beauty">
          <AudienceServicesPage {...common} audience="women" />
        </Route>
        <Route path="/hair-self-care">
          <AudienceServicesPage {...common} audience="self-care" />
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
            selectedHairStyle={selectedHairStyle}
            notesError={notesError}
          />
        </Route>
        <Route path="/style-gallery">
          <GalleryPage onChooseStyle={chooseHairStyle} />
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
  products: GgsProduct[];
  productsQuery: ReturnType<typeof useGetGgsPublicProducts>;
  cartItems: CartLine[];
  cartCount: number;
  addProductToCart: (product: GgsProduct) => void;
  changeCartQuantity: (productId: number, change: number) => void;
  removeCartItem: (productId: number) => void;
};

const homeShortcuts = [
  { label: 'Beranda', href: '/', icon: House, tone: 'quick-tone-blue' },
  { label: "Men's Grooming", href: '/mens-grooming', icon: Scissors, tone: 'quick-tone-rose' },
  { label: "Women's Hair & Beauty", href: '/womens-hair-beauty', icon: Sparkles, tone: 'quick-tone-violet' },
  { label: 'Hair & Self Care', href: '/hair-self-care', icon: Droplets, tone: 'quick-tone-sage' },
  { label: 'Galeri Gaya', href: '/style-gallery', icon: Sparkles, tone: 'quick-tone-violet' },
  { label: 'Produk', href: '/products', icon: ShoppingBag, tone: 'quick-tone-plum' },
  { label: 'Booking', href: '/book', icon: CalendarDays, tone: 'quick-tone-gold' },
  { label: 'Promo & Membership', href: '/offers-membership', icon: Gift, tone: 'quick-tone-sage' },
  { label: 'Cabang', href: '/branches', icon: MapPin, tone: 'quick-tone-blue' },
  { label: 'My GGS', href: '/my-ggs', icon: UserRound, tone: 'quick-tone-plum' },
];

const homeMenuPageSize = 6;

function HomePage({ services, servicesQuery, site, openBooking }: SharedProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [menuPage, setMenuPage] = useState(0);
  const menuPageCount = Math.ceil(homeShortcuts.length / homeMenuPageSize);
  const visibleHomeShortcuts = homeShortcuts.slice(
    menuPage * homeMenuPageSize,
    (menuPage + 1) * homeMenuPageSize,
  );
  const slides = [
    {
      eyebrow: 'GGS HAIR STUDIO · MULAI DARI SINI',
      headline: <>Sebelum gunting,<br /><em>kita ngobrol.</em></>,
      detail: site?.tagline?.trim() || 'Ceritakan kebutuhan rambutmu sebelum memilih layanan.',
      cta: 'Ajukan janji',
      path: '/book',
      image: site?.heroImageUrl || '/ggs-carousel-consultation.jpg',
      imageAlt: 'Potret editorial rambut bob untuk konsultasi gaya GGS',
    },
    {
      eyebrow: 'LAYANAN GGS',
      headline: <>Pilih layanan<br /><em>yang sesuai.</em></>,
      detail: 'Lihat layanan, durasi, dan harga yang saat ini tersedia. Tim GGS akan membahas detail sebelum mengonfirmasi.',
      cta: 'Pilih kategori',
      path: '/services',
      image: '/ggs-carousel-style.jpg',
      imageAlt: 'Potret editorial rambut berlayer untuk inspirasi layanan GGS',
    },
    {
      eyebrow: 'AJUKAN JANJI TEMU',
      headline: <>Mulai dari<br /><em>obrolan.</em></>,
      detail: 'Sampaikan layanan dan waktu yang kamu inginkan. Tim GGS akan menghubungi untuk membahas dan mengonfirmasi permintaan.',
      cta: 'Buat janji',
      path: '/book',
      image: '/ggs-carousel-care.jpg',
      imageAlt: 'Potret editorial rambut ikal untuk sorotan perawatan GGS',
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

  return (
    <>
      <section
        className="ggs-carousel"
        aria-label="Banner sorotan GGS"
        aria-roledescription="carousel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
        }}
        data-testid="carousel-home"
      >
        <div className="ggs-carousel-stage">
          <div className="ggs-carousel-track">
            {slides.map((item, index) => {
              const offset = (index - active + slides.length) % slides.length;
              const position = offset === 0 ? 'active' : offset === 1 ? 'next' : 'previous';
              return (
                <article
                  className={`ggs-carousel-slide ggs-carousel-slide-${position}${index === 0 && site?.heroImageUrl ? ' ggs-carousel-cms-image' : ''}`}
                  key={item.eyebrow}
                  aria-roledescription="slide"
                  aria-label={`${index + 1} dari ${slides.length}`}
                  aria-hidden={position !== 'active'}
                  data-testid={`banner-slide-${index + 1}`}
                >
                  <img src={item.image} alt={item.imageAlt} />
                  <div className="ggs-carousel-shade" />
                  <div className="ggs-carousel-copy">
                    <p className="ggs-carousel-eyebrow">{item.eyebrow}</p>
                    <h1 data-testid={position === 'active' ? 'text-hero-title' : undefined}>{item.headline}</h1>
                    <p className="ggs-carousel-detail" data-testid={position === 'active' ? 'text-hero-intro' : undefined}>{item.detail}</p>
                    <Link className="ggs-carousel-cta" href={item.path} tabIndex={position === 'active' ? 0 : -1} data-testid={position === 'active' ? 'link-hero-action' : undefined}>
                      {item.cta} <ArrowRight size={17} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          <button
            className="ggs-carousel-arrow ggs-carousel-arrow-previous"
            type="button"
            aria-label="Sorotan sebelumnya"
            onClick={() => setActive((active + slides.length - 1) % slides.length)}
            data-testid="button-banner-previous"
          ><ArrowLeft size={18} /></button>
          <button
            className="ggs-carousel-arrow ggs-carousel-arrow-next"
            type="button"
            aria-label="Sorotan berikutnya"
            onClick={() => setActive((active + 1) % slides.length)}
            data-testid="button-banner-next"
          ><ArrowRight size={18} /></button>
        </div>
        <div className="ggs-carousel-pagination">
          <div className="ggs-carousel-dots" aria-label="Pilih sorotan">
            {slides.map((item, index) => (
              <button
                type="button"
                key={item.eyebrow}
                aria-label={`Tampilkan sorotan ${index + 1}`}
                aria-current={active === index ? 'true' : undefined}
                onClick={() => setActive(index)}
                data-testid={`button-banner-${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

        <section className="clearer-home-menu ggs-quick-menu" aria-label="Jelajahi GGS">
          <nav
            className="ggs-quick-menu-grid"
            aria-label={`Pintasan GGS, halaman ${menuPage + 1} dari ${menuPageCount}`}
            data-count={visibleHomeShortcuts.length}
            key={menuPage}
          >
            {visibleHomeShortcuts.map((item) => (
              <Link
                className={`ggs-quick-menu-item${item.href === '/mens-grooming' ? ' ggs-menu-mens' : ''}${item.href === '/womens-hair-beauty' ? ' ggs-menu-womens' : ''}${item.href === '/hair-self-care' ? ' ggs-menu-self-care' : ''}`}
                href={item.href}
                key={item.href}
                data-testid={`link-home-menu-${item.href === '/' ? 'home' : item.href.slice(1)}`}
              >
                <span className={`ggs-quick-menu-icon ${item.tone}`}><item.icon size={27} strokeWidth={1.8} /></span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          {menuPageCount > 1 && (
            <div className="ggs-quick-menu-pagination" aria-label="Kontrol halaman menu">
              <button
                type="button"
                aria-label="Halaman menu sebelumnya"
                onClick={() => setMenuPage((page) => (page + menuPageCount - 1) % menuPageCount)}
              ><ArrowLeft size={16} /></button>
              <div className="ggs-quick-menu-dots" aria-label="Pilih halaman menu">
                {Array.from({ length: menuPageCount }, (_, index) => (
                  <button
                    type="button"
                    key={index}
                    aria-label={`Tampilkan halaman menu ${index + 1}`}
                    aria-current={menuPage === index ? 'true' : undefined}
                    onClick={() => setMenuPage(index)}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Halaman menu berikutnya"
                onClick={() => setMenuPage((page) => (page + 1) % menuPageCount)}
              ><ArrowRight size={16} /></button>
            </div>
          )}
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
          <Link href="/services" className="clearer-text-link" data-testid="link-all-services">Pilih kategori <ArrowRight size={16} /></Link>
        </div>
        <ServiceList {...{ services, servicesQuery, openBooking }} compact />
      </section>

      <section className="home-editorial-band">
        <div className="home-editorial-index">GGS / CATATAN 01</div>
        <p>Pilih model rambut pria sebagai referensi booking.<br /><em>Katalog hasil styling dan warna rambut akan hadir setelah foto GGS tersedia.</em></p>
        <Link href="/style-gallery" data-testid="link-home-inspiration">Buka Style Gallery <ArrowUpRight size={17} /></Link>
      </section>
      <section className="home-last-cta">
        <div><p className="clearer-kicker">BOOK APPOINTMENT</p><h2>Ceritakan<br /><em>yang kamu inginkan.</em></h2></div>
        <Link href="/book" className="clearer-primary-button" data-testid="link-home-booking">Buat janji <ArrowRight size={17} /></Link>
      </section>
    </>
  );
}

function ServicesPage() {
  return (
    <PageFrame kicker="GGS / LAYANAN" title={<>Pilih kategori,<br /><em>yang sesuai.</em></>} intro="Pilih kategori yang sesuai untuk melihat deskripsi dan layanan aktif GGS." testId="page-services">
      <div className="service-category-grid" aria-label="Kategori layanan GGS" data-testid="list-service-categories">
        <article className="service-category-card" data-testid="card-service-category-mens">
          <p className="clearer-kicker">KATEGORI PRIA</p>
          <h3>Men's Grooming</h3>
          <p className="service-category-description">Khusus kebutuhan pria: haircut, skin fade, taper, hair styling, hair coloring, beard grooming jika tersedia, serta inspirasi gaya rambut pria.</p>
          <div className="service-category-feature">
            <span>FITUR UNGGULAN</span>
            <strong>Pilih model rambut sebelum booking.</strong>
          </div>
          <Link className="service-category-link" href="/mens-grooming" data-testid="link-category-mens-style">
            Lihat layanan pria <ArrowRight size={16} />
          </Link>
        </article>
        <article className="service-category-card" data-testid="card-service-category-womens">
          <p className="clearer-kicker">KATEGORI WANITA</p>
          <h3>Women's Hair &amp; Beauty</h3>
          <p className="service-category-description">Potong rambut, blow, hair styling, coloring, smoothing, creambath, hair spa, dan perawatan kecantikan lain sesuai layanan GGS.</p>
          <div className="service-category-feature">
            <span>FITUR UNGGULAN</span>
            <strong>Katalog hasil styling dan warna rambut.</strong>
          </div>
          <Link className="service-category-link" href="/womens-hair-beauty" data-testid="link-category-womens-gallery">
            Lihat layanan wanita <ArrowRight size={16} />
          </Link>
        </article>
        <article className="service-category-card" data-testid="card-service-category-self-care">
          <p className="clearer-kicker">HAIR &amp; SELF CARE</p>
          <h3>Hair &amp; Self Care</h3>
          <p className="service-category-description">Paket perawatan rambut dan kulit kepala, hair spa, scalp treatment, serta paket grooming sebelum acara penting.</p>
          <div className="service-category-feature">
            <span>FITUR UNGGULAN</span>
            <strong>Cocok untuk meningkatkan nilai transaksi per kunjungan.</strong>
          </div>
          <Link className="service-category-link" href="/hair-self-care" data-testid="link-category-self-care">
            Lihat perawatan <ArrowRight size={16} />
          </Link>
        </article>
      </div>
      <div className="service-page-note" data-testid="text-service-category-note">
        <Sparkles size={18} /> Harga, durasi, dan ketersediaan mengikuti layanan aktif yang ditampilkan di masing-masing kategori. Beard grooming hanya tersedia jika dikonfirmasi tim GGS.
      </div>
    </PageFrame>
  );
}

type ServiceAudience = 'men' | 'women' | 'self-care';

const audienceCategoryMap: Record<ServiceAudience, Set<string>> = {
  men: new Set(['cut & styling', 'color', 'styling']),
  women: new Set(['cut & styling', 'color', 'hair care', 'styling']),
  'self-care': new Set(['hair care', 'styling']),
};

function AudienceServicesPage({ services, servicesQuery, openBooking, audience }: SharedProps & { audience: ServiceAudience }) {
  const page = audience === 'men'
    ? {
        label: "MEN'S GROOMING",
        title: <>Men's<br /><em>Grooming.</em></>,
        intro: 'Khusus kebutuhan pria: haircut, skin fade, taper, hair styling, hair coloring, beard grooming jika tersedia, serta inspirasi gaya rambut pria.',
        feature: 'Pilih model rambut sebelum booking.',
        action: 'Pilih model rambut',
        note: 'Beard grooming hanya tersedia jika dikonfirmasi oleh tim GGS.',
      }
    : audience === 'self-care'
      ? {
          label: 'HAIR & SELF CARE',
          title: <>Hair &amp;<br /><em>Self Care.</em></>,
          intro: 'Paket perawatan rambut dan kulit kepala, hair spa, scalp treatment, serta paket grooming sebelum acara penting.',
          feature: 'Cocok untuk meningkatkan nilai transaksi per kunjungan.',
          action: 'Lihat layanan aktif',
          note: 'Paket dan scalp treatment hanya ditampilkan jika tersedia sebagai layanan aktif GGS.',
        }
      : {
          label: "WOMEN'S HAIR & BEAUTY",
          title: <>Women's Hair<br /><em>&amp; Beauty.</em></>,
          intro: 'Potong rambut, blow, hair styling, coloring, smoothing, creambath, hair spa, dan perawatan kecantikan lain sesuai layanan GGS.',
          feature: 'Katalog hasil styling dan warna rambut.',
          action: 'Lihat katalog',
          note: 'Katalog hasil styling dan warna akan diisi setelah foto hasil GGS tersedia dan terverifikasi.',
        };
  const categories = audienceCategoryMap[audience];
  const audienceServices = services.filter((service) => categories.has(service.category.trim().toLowerCase()));

  return (
    <PageFrame kicker={`GGS / ${page.label}`} title={page.title} intro={page.intro} testId={`page-services-${audience}`}>
      <section className="service-audience-feature" data-testid={`feature-services-${audience}`}>
        <div>
          <p className="clearer-kicker">FITUR UNGGULAN</p>
          <h2>{page.feature}</h2>
          <p>{page.note}</p>
        </div>
        {audience === 'self-care' ? (
          <a href="#active-services-self-care" className="clearer-primary-button" data-testid={`link-services-feature-${audience}`}>
            {page.action} <ArrowRight size={17} />
          </a>
        ) : (
          <Link href="/style-gallery" className="clearer-primary-button" data-testid={`link-services-feature-${audience}`}>
            {page.action} <ArrowRight size={17} />
          </Link>
        )}
      </section>
      <section
        className="service-audience-list"
        id={audience === 'self-care' ? 'active-services-self-care' : undefined}
        aria-labelledby={`heading-services-${audience}`}
        data-testid={`list-services-${audience}`}
      >
        <div className="clearer-section-heading">
          <div><p className="clearer-kicker">LAYANAN AKTIF</p><h2 id={`heading-services-${audience}`}>Pilihan layanan.</h2></div>
        </div>
        <p className="service-provisional-note">Pengelompokan awal ini masih sementara dan dapat disesuaikan. Hanya layanan aktif GGS yang ditampilkan.</p>
        <ServiceList services={audienceServices} servicesQuery={servicesQuery} openBooking={openBooking} />
      </section>
    </PageFrame>
  );
}

function ProductsPage({ products, productsQuery, cartItems, cartCount, addProductToCart }: SharedProps) {
  const quantityInCart = (productId: number) =>
    cartItems.find((item) => item.productId === productId)?.quantity ?? 0;

  return (
    <PageFrame
      kicker="GGS / PRODUK"
      title={<>Perawatan<br /><em>di rumah.</em></>}
      intro="Lihat produk yang tersedia dan masukkan pilihanmu ke keranjang. Keranjang menampilkan total sementara; belum ada checkout atau pembayaran online."
      testId="page-products"
    >
      {productsQuery.isLoading ? <div className="clearer-visit-empty" data-testid="status-products-loading">Memuat katalog produk…</div> :
        productsQuery.isError ? <div className="clearer-visit-empty" role="alert" data-testid="status-products-error"><p>Katalog produk belum bisa dimuat.</p><button type="button" onClick={() => productsQuery.refetch()} data-testid="button-retry-products">Coba lagi</button></div> :
          products.length ? (
            <div className="ggs-product-grid" data-testid="list-products">
              {products.map((product) => {
                const quantity = quantityInCart(product.id);
                return (
                  <article className="ggs-product-card" key={product.id} data-testid={`card-product-${product.id}`}>
                    {product.imageUrl ? <img className="ggs-product-image" src={product.imageUrl} alt={product.name} /> :
                      <div className="ggs-product-image ggs-product-image-empty" aria-label="Foto produk belum tersedia"><ShoppingBag size={28} /></div>}
                    <div className="ggs-product-card-copy">
                      <span className="ggs-product-category">{product.category || 'GGS'}</span>
                      <h2>{product.name}</h2>
                      {product.description && <p>{product.description}</p>}
                      <div className="ggs-product-price">{money(product.price)}</div>
                      <div className="ggs-product-card-footer">
                        <small>{product.stock > 0 ? `Stok ${product.stock}` : 'Stok habis'}</small>
                        <button type="button" disabled={!product.active || product.stock < 1 || quantity >= product.stock} onClick={() => addProductToCart(product)} data-testid={`button-add-product-${product.id}`}>
                          {product.stock < 1 ? 'Habis' : quantity ? `${quantity} di keranjang · Tambah` : 'Tambah ke keranjang'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <section className="unavailable-panel products-empty" data-testid="status-products-empty">
              <div className="empty-ornament"><ShoppingBag size={25} /></div>
              <span className="panel-index">KATALOG / BELUM TERSEDIA</span>
              <h2>Belum ada produk<br />yang ditampilkan.</h2>
              <p>GGS belum menambahkan produk ke katalog. Produk dan harga akan tampil setelah datanya dimasukkan oleh studio.</p>
            </section>
          )}
      {cartItems.length > 0 && (
        <aside className="ggs-products-cart-summary" aria-live="polite" data-testid="products-cart-summary">
          <div><span>{cartCount} item di keranjang</span><strong>{money(cartItems.reduce((sum, item) => sum + (products.find((product) => product.id === item.productId)?.price || 0) * item.quantity, 0))}</strong></div>
          <p>Total sementara. Belum ada checkout atau pembayaran.</p>
        </aside>
      )}
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
  selectedHairStyle: string | null;
  notesError: string;
};

function BookingPage({ services, servicesQuery, fields, updateField, handleSubmit, appointment, submitted, setSubmitted, setFields, selectedHairStyle, notesError }: BookingProps) {
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
                {selectedHairStyle && <p className="booking-style-note" data-testid="text-selected-hair-style"><Sparkles size={16} /> Model rambut pilihan: <strong>{selectedHairStyle}</strong>. Pilihan ini akan disertakan pada permintaanmu.</p>}
                <label className="clearer-form-wide">Catatan untuk tim <span>(opsional)</span><textarea maxLength={selectedHairStyle ? 560 : 600} value={fields.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Ceritakan hal yang perlu diketahui tentang rambut atau permintaanmu." data-testid="input-appointment-notes" /></label>
                {notesError && <p role="alert" className="clearer-error clearer-form-wide" data-testid="status-booking-notes-error">{notesError}</p>}
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

const hairStyleChoices = [
  { id: 'skin-fade', label: 'Skin fade' },
  { id: 'taper', label: 'Taper' },
  { id: 'gaya-lain', label: 'Gaya lain' },
];

function GalleryPage({ onChooseStyle }: { onChooseStyle: (style: string) => void }) {
  return (
    <PageFrame kicker="GGS / STYLE GALLERY" title={<>Pilih inspirasi,<br /><em>sebelum booking.</em></>} intro="Pilih model rambut pria sebagai referensi permintaan booking. Katalog hasil styling dan warna rambut akan ditampilkan setelah foto GGS tersedia dan terverifikasi." testId="page-gallery">
      <section className="gallery-style-picker" aria-labelledby="gallery-men-heading" data-testid="section-mens-style-picker">
        <div className="gallery-section-heading">
          <p className="clearer-kicker">MEN'S GROOMING</p>
          <h2 id="gallery-men-heading">Pilih referensi gaya rambut pria.</h2>
          <p>Pilih Skin fade, Taper, atau gaya lain. Tim GGS akan membahas detail dan ketersediaan sebelum mengonfirmasi.</p>
        </div>
        <div className="gallery-style-choice-grid">
          {hairStyleChoices.map((style, index) => (
            <Link
              className="gallery-style-choice"
              href="/book"
              key={style.id}
              onClick={() => onChooseStyle(style.label)}
              data-testid={`link-style-choice-${style.id}`}
            >
              <span>0{index + 1} / REFERENSI</span>
              <strong>{style.label}</strong>
              <small>Pilih sebagai catatan untuk booking</small>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>
        <p className="gallery-editorial-note">Pilihan ini menjadi referensi konsultasi, bukan jaminan hasil. Foto hasil rambut pria GGS belum tersedia.</p>
      </section>
      <section className="gallery-women-catalog" aria-labelledby="gallery-women-heading" data-testid="section-womens-style-catalog">
        <div className="gallery-section-heading">
          <p className="clearer-kicker">WOMEN'S HAIR &amp; BEAUTY</p>
          <h2 id="gallery-women-heading">Katalog styling dan warna rambut.</h2>
          <p>Foto hasil GGS yang terverifikasi akan ditampilkan di sini.</p>
        </div>
        <div className="gallery-placeholder-grid" aria-label="Bagian katalog yang belum tersedia">
          {['Hasil styling', 'Warna rambut'].map((title, index) => (
            <div className="gallery-placeholder" key={title} data-testid={`status-gallery-category-${index}`}>
              <span>0{index + 1}</span>
              <strong>{title}</strong>
              <small>Foto hasil GGS belum tersedia</small>
            </div>
          ))}
        </div>
      </section>
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
