import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Banknote, BarChart3, CalendarDays, Clock3, LayoutDashboard, LockKeyhole, LogOut, Menu, Package, RefreshCw, Search, ShieldCheck, Store, UserRound, UsersRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  getGetGgsEmployeeBookingsQueryKey,
  getGetGgsEmployeeAttendanceHistoryQueryKey,
  getGetGgsEmployeeAttendanceTodayQueryKey,
  getGetGgsEmployeeCashierSessionQueryKey,
  getGetGgsEmployeeSessionQueryKey,
  useGetGgsEmployeeBookings,
  useGetGgsEmployeeCashierSession,
  useGetGgsEmployeeSession,
  useLoginGgsEmployee,
  useLogoutGgsEmployeeCashier,
  useLogoutGgsEmployee,
  useUnlockGgsEmployeeCashier,
} from '@workspace/api-client-react';
import type { GgsEmployeeBooking, GgsEmployeeCashierRegister, LoginGgsEmployeeMutationVariables } from '@workspace/api-client-react';
import { EmployeeAttendancePage } from './EmployeeAttendancePage';
import './employee-workspace.css';

function employeeErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return 'Tidak dapat masuk saat ini. Periksa ID dan kata sandi, lalu coba lagi.';
}

function displayDate(value: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: 'Asia/Jakarta' }).format(parsed);
}

function dateKey(value: string): string {
  return value.slice(0, 10);
}

function isSameDayAsJakarta(value: string): boolean {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  return dateKey(value) === today;
}

function employeeNextPath(): string {
  const requestedPath = new URLSearchParams(window.location.search).get('next');
  if (!requestedPath) return '/employee/overview';

  try {
    const destination = new URL(requestedPath, window.location.origin);
    if (
      destination.origin !== window.location.origin ||
      !destination.pathname.startsWith('/employee/') ||
      destination.pathname === '/employee/sign-in'
    ) {
      return '/employee/overview';
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return '/employee/overview';
  }
}

const statusLabels: Record<GgsEmployeeBooking['status'], string> = {
  pending: 'Menunggu',
  confirmed: 'Terkonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const employeeMenuItems = [
  { href: '/employee/overview', label: 'Ringkasan', icon: LayoutDashboard, description: 'Ringkasan studio.' },
  { href: '/employee/schedule', label: 'Jadwal booking', icon: CalendarDays, description: 'Booking pelanggan yang masuk ke studio.' },
  { href: '/employee/attendance', label: 'Absensi', icon: Clock3, description: 'Pencatatan kehadiran tim karyawan.' },
  { href: '/employee/cashier', label: 'Kasir', icon: Banknote, description: 'Pencatatan transaksi layanan dan produk.' },
  { href: '/employee/customers', label: 'Pelanggan', icon: UsersRound, description: 'Informasi dan riwayat kunjungan pelanggan.' },
  { href: '/employee/stock', label: 'Stok produk', icon: Package, description: 'Pemantauan ketersediaan produk studio.' },
  { href: '/employee/reports', label: 'Laporan', icon: BarChart3, description: 'Rekap kegiatan dan performa studio.' },
] as const;

const cashierRegisters: {
  value: GgsEmployeeCashierRegister;
  label: string;
  description: string;
}[] = [
  { value: 'ggs_beauty', label: 'GGS Beauty', description: 'Kasir layanan kecantikan' },
  { value: 'barber_ggs', label: 'Barber GGS', description: 'Kasir layanan barber' },
];

type EmployeeMenuItem = (typeof employeeMenuItems)[number];

function cashierErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return 'Kasir belum dapat dibuka. Periksa koneksi lalu coba lagi.';
}

function EmployeeCashierPage() {
  const queryClient = useQueryClient();
  const cashierSession = useGetGgsEmployeeCashierSession({
    query: {
      queryKey: getGetGgsEmployeeCashierSessionQueryKey(),
      retry: false,
      staleTime: 0,
    },
  });
  const unlockCashier = useUnlockGgsEmployeeCashier();
  const lockCashier = useLogoutGgsEmployeeCashier();
  const [selectedRegister, setSelectedRegister] = useState<GgsEmployeeCashierRegister>('ggs_beauty');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [lockError, setLockError] = useState('');
  const activeRegister = cashierRegisters.find(
    (register) => register.value === cashierSession.data?.register,
  );
  const hasActiveAccess = Boolean(cashierSession.data?.active && activeRegister);

  const submitUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (password.length < 8) {
      setFormError('Kata sandi minimal 8 karakter.');
      return;
    }
    unlockCashier.mutate(
      { data: { register: selectedRegister, password } },
      {
        onSuccess: async () => {
          setPassword('');
          await queryClient.invalidateQueries({
            queryKey: getGetGgsEmployeeCashierSessionQueryKey(),
          });
        },
        onError: (error) => setFormError(cashierErrorMessage(error)),
      },
    );
  };

  const submitLock = () => {
    setLockError('');
    if (activeRegister) setSelectedRegister(activeRegister.value);
    lockCashier.mutate(undefined, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetGgsEmployeeCashierSessionQueryKey(),
        });
      },
      onError: (error) => setLockError(cashierErrorMessage(error)),
    });
  };

  return (
    <div className="employee-cashier" data-testid="employee-cashier">
      <header className="employee-cashier__heading">
        <div>
          <p className="employee-kicker">AKSES KASIR</p>
          <h1>Kasir <em>GGS.</em></h1>
          <p>Pilih unit kasir, lalu masukkan kata sandi khusus unit tersebut.</p>
        </div>
        <span className="employee-cashier__secure-label"><LockKeyhole size={15} aria-hidden="true" /> Akses terlindungi</span>
      </header>

      {cashierSession.isLoading ? (
        <section className="employee-cashier__state" role="status">Memeriksa akses kasir…</section>
      ) : cashierSession.isError ? (
        <section className="employee-cashier__state employee-cashier__state--error" role="alert">
          <div><strong>Status kasir belum dapat dimuat.</strong><p>Periksa koneksi, lalu perbarui status akses.</p></div>
          <button
            type="button"
            onClick={() => void cashierSession.refetch()}
            disabled={cashierSession.isFetching}
            data-testid="button-refresh-employee-cashier"
          >
            {cashierSession.isFetching ? 'Memuat…' : 'Coba lagi'}
          </button>
        </section>
      ) : hasActiveAccess && activeRegister ? (
        <section className="employee-cashier__unlocked" aria-labelledby="employee-cashier-active-title">
          <div className="employee-cashier__unlocked-icon"><Store size={21} aria-hidden="true" /></div>
          <p className="employee-kicker">AKSES AKTIF</p>
          <h2 id="employee-cashier-active-title">{activeRegister.label}</h2>
          <p>{activeRegister.description}. Akses akan terkunci otomatis saat sesi berakhir.</p>
          {cashierSession.data?.expiresAt && (
            <p className="employee-cashier__expiry">
              Berlaku sampai {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(cashierSession.data.expiresAt))}
            </p>
          )}
          {lockError && <p className="employee-form-error" role="alert">{lockError}</p>}
          <button
            type="button"
            className="employee-cashier__lock-button"
            onClick={submitLock}
            disabled={lockCashier.isPending}
            data-testid="button-lock-employee-cashier"
          >
            <LockKeyhole size={15} aria-hidden="true" />
            {lockCashier.isPending ? 'Mengunci kasir…' : 'Kunci kasir'}
          </button>
        </section>
      ) : (
        <section className="employee-cashier__access" aria-label="Buka akses kasir">
          <div className="employee-cashier__registers" role="group" aria-label="Pilih unit kasir">
            {cashierRegisters.map((register) => (
              <button
                key={register.value}
                type="button"
                className={`employee-cashier__register${selectedRegister === register.value ? ' employee-cashier__register--selected' : ''}`}
                aria-pressed={selectedRegister === register.value}
                onClick={() => {
                  setSelectedRegister(register.value);
                  setFormError('');
                }}
                data-testid={`button-select-cashier-${register.value}`}
              >
                <span className="employee-cashier__register-icon"><Store size={18} aria-hidden="true" /></span>
                <span><strong>{register.label}</strong><small>{register.description}</small></span>
                <span className="employee-cashier__register-check" aria-hidden="true">{selectedRegister === register.value ? '✓' : ''}</span>
              </button>
            ))}
          </div>

          <form className="employee-cashier__form" onSubmit={submitUnlock}>
            <label htmlFor="employee-cashier-password">Kata sandi minimal 8 karakter · {cashierRegisters.find((item) => item.value === selectedRegister)?.label}</label>
            <input
              id="employee-cashier-password"
              name="cashier-password"
              type="password"
              autoComplete="off"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Masukkan kata sandi kasir"
              data-testid="input-employee-cashier-password"
            />
            {formError && <p className="employee-form-error" role="alert" data-testid="status-employee-cashier-error">{formError}</p>}
            <button
              type="submit"
              className="employee-primary-button"
              disabled={unlockCashier.isPending}
              data-testid="button-unlock-employee-cashier"
            >
              <span>{unlockCashier.isPending ? 'Memverifikasi…' : 'Buka kasir'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <p className="employee-cashier__privacy"><ShieldCheck size={15} aria-hidden="true" /> Kata sandi diperiksa di server dan tidak disimpan di perangkat.</p>
          </form>
        </section>
      )}
    </div>
  );
}

function EmployeeOverview({
  employeeName,
  bookings,
  isLoading,
  isError,
  onRetry,
}: {
  employeeName: string;
  bookings: GgsEmployeeBooking[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const todayBookings = bookings.filter((booking) => isSameDayAsJakarta(booking.appointmentDate));
  const pendingBookings = bookings.filter((booking) => booking.status === 'pending');
  const latestBookings = [...bookings]
    .sort((first, second) => `${dateKey(first.appointmentDate)} ${first.appointmentTime}`.localeCompare(`${dateKey(second.appointmentDate)} ${second.appointmentTime}`))
    .filter((booking) => dateKey(booking.appointmentDate) >= today)
    .slice(0, 3);
  const displayCount = (count: number) => isLoading ? '—' : isError ? '–' : count.toString();

  return (
    <div className="employee-dashboard" data-testid="employee-overview">
      <section className="employee-dashboard__heading">
        <div>
          <h1>Halo, {employeeName}</h1>
          <p>{displayDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <Link href="/employee/schedule" className="employee-primary-button" data-testid="link-overview-schedule">
          Jadwal booking <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>

      <section className="employee-dashboard__stats" aria-label="Ringkasan booking">
        <article className="employee-dashboard__stat">
          <span>Booking hari ini</span>
          <strong>{displayCount(todayBookings.length)}</strong>
        </article>
        <article className="employee-dashboard__stat">
          <span>Menunggu konfirmasi</span>
          <strong>{displayCount(pendingBookings.length)}</strong>
        </article>
        <article className="employee-dashboard__stat">
          <span>Total booking</span>
          <strong>{displayCount(bookings.length)}</strong>
        </article>
      </section>

      <section className="employee-dashboard__activity" aria-labelledby="employee-overview-activity-title">
        <div className="employee-dashboard__section-title">
          <h2 id="employee-overview-activity-title">Booking terdekat</h2>
        </div>
        {isLoading ? (
          <EmployeeBookingsSkeleton />
        ) : isError ? (
          <div className="employee-bookings__error" role="alert">
            <div><strong>Ringkasan belum dapat dimuat.</strong><p>Periksa koneksi, lalu coba lagi.</p></div>
            <button type="button" onClick={onRetry}>Coba lagi</button>
          </div>
        ) : latestBookings.length ? (
          <div className="employee-booking-list">
            {latestBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
          </div>
        ) : (
          <div className="employee-bookings__empty">
            <p>Belum ada booking.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function EmployeeModulePlaceholder({ item }: { item: EmployeeMenuItem }) {
  const Icon = item.icon;

  return (
    <section className="employee-module-placeholder" data-testid={`employee-module-${item.href.split('/').pop()}`}>
      <div className="employee-module-placeholder__icon"><Icon size={21} aria-hidden="true" /></div>
      <p className="employee-kicker">MENU KARYAWAN</p>
      <h1>{item.label}</h1>
      <p>{item.description}</p>
      <span className="employee-module-placeholder__status">MENU BELUM AKTIF</span>
    </section>
  );
}

export function EmployeeSignInPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLoginGgsEmployee();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const variables: LoginGgsEmployeeMutationVariables = {
      data: {
        employeeId: employeeId.trim(),
        password,
      },
    };
    login.mutate(variables, {
      onSuccess: async () => {
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeAttendanceTodayQueryKey(), exact: true });
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeAttendanceHistoryQueryKey(), exact: true });
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeCashierSessionQueryKey(), exact: true });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeSessionQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeBookingsQueryKey() }),
        ]);
        setLocation(employeeNextPath());
      },
      onError: (error) => setFormError(employeeErrorMessage(error)),
    });
  };

  return (
    <main className="employee-workspace employee-sign-in" data-testid="page-employee-sign-in">
      <header className="employee-topbar">
        <Link href="/" className="employee-brand" data-testid="link-employee-home">
          <span className="employee-brand__mark" aria-hidden="true">G</span>
          <span><strong>GGS</strong><small>HAIR STUDIO</small></span>
        </Link>
        <span className="employee-topbar__label">RUANG KERJA / KARYAWAN</span>
      </header>

      <div className="employee-sign-in__layout">
        <section className="employee-sign-in__intro">
          <div className="employee-sign-in__ornament" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h1>Kerja rapi.<br /><em>Studio siap.</em></h1>
          <p>Masuk untuk membuka ruang kerja karyawan dan melanjutkan absensi.</p>
          <div className="employee-sign-in__privacy">
            <ShieldCheck size={17} strokeWidth={1.7} aria-hidden="true" />
            <span>Area khusus tim GGS. Informasi booking ditampilkan untuk kebutuhan operasional.</span>
          </div>
          <Link href="/sign-in" className="employee-back-link" data-testid="link-employee-customer-sign-in">
            <ArrowLeft size={15} aria-hidden="true" />
            Kembali ke masuk pelanggan
          </Link>
        </section>

        <section className="employee-login-card" aria-labelledby="employee-login-title">
          <div className="employee-login-card__heading">
            <span className="employee-login-card__icon"><UserRound size={18} aria-hidden="true" /></span>
            <div>
              <p className="employee-kicker">GGS / TEAM ACCESS</p>
              <h2 id="employee-login-title">Masuk karyawan</h2>
            </div>
          </div>
          <form className="employee-login-form" onSubmit={submitLogin}>
            <label htmlFor="employee-id">ID karyawan</label>
            <input
              id="employee-id"
              name="employeeId"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              minLength={2}
              maxLength={32}
              required
              placeholder="Masukkan ID karyawan"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              data-testid="input-employee-id"
            />
            <label htmlFor="employee-password">Kata sandi</label>
            <input
              id="employee-password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              maxLength={128}
              required
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              data-testid="input-employee-password"
            />
            {(formError || login.isError) && (
              <p className="employee-form-error" role="alert" data-testid="status-employee-login-error">
                {formError || 'Tidak dapat masuk. Silakan coba lagi.'}
              </p>
            )}
            <button className="employee-primary-button" type="submit" disabled={login.isPending} data-testid="button-employee-sign-in">
              <span>{login.isPending ? 'Memeriksa akses…' : 'Masuk ke jadwal'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>

      <footer className="employee-page-footer">
        <span>GGS HAIR STUDIO</span>
        <span>INTERNAL / STAFF ONLY</span>
      </footer>
    </main>
  );
}

function EmployeeBookingsSkeleton() {
  return (
    <div className="employee-bookings-skeleton" role="status" aria-label="Memuat jadwal booking">
      <span />
      <span />
      <span />
    </div>
  );
}

function BookingCard({ booking }: { booking: GgsEmployeeBooking }) {
  return (
    <article className="employee-booking-card" data-testid={`card-employee-booking-${booking.id}`}>
      <div className="employee-booking-card__time">
        <span>{booking.appointmentTime}</span>
        <small>{displayDate(booking.appointmentDate, { day: 'numeric', month: 'short' })}</small>
      </div>
      <div className="employee-booking-card__main">
        <div className="employee-booking-card__title">
          <div>
            <h3>{booking.customerName}</h3>
            <p>{booking.serviceName}</p>
          </div>
          <span className={`employee-status employee-status--${booking.status}`}>{statusLabels[booking.status] ?? booking.status}</span>
        </div>
        <div className="employee-booking-card__details">
          <span><Clock3 size={14} aria-hidden="true" /> {booking.phone}</span>
          {booking.notes.trim() && <p>{booking.notes}</p>}
        </div>
      </div>
    </article>
  );
}

export function EmployeeSchedulePage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const session = useGetGgsEmployeeSession({
    query: {
      queryKey: getGetGgsEmployeeSessionQueryKey(),
      retry: false,
      staleTime: 0,
    },
  });
  const bookings = useGetGgsEmployeeBookings({
    query: {
      queryKey: getGetGgsEmployeeBookingsQueryKey(),
      enabled: Boolean(session.isSuccess && session.data?.active),
      retry: false,
      staleTime: 0,
    },
  });
  const logout = useLogoutGgsEmployee();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [logoutError, setLogoutError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches,
  );
  const currentMenu = employeeMenuItems.find((item) => item.href === location) ?? employeeMenuItems[0];
  const authenticated = Boolean(session.isSuccess && session.data?.active);

  const sortedBookings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    return [...(bookings.data ?? [])]
      .filter((booking) => {
        const matchesSearch = !query || `${booking.customerName} ${booking.phone} ${booking.serviceName}`.toLocaleLowerCase('id-ID').includes(query);
        const today = isSameDayAsJakarta(booking.appointmentDate);
        const matchesDate = dateFilter === 'all' || (dateFilter === 'today' && today) || (dateFilter === 'upcoming' && dateKey(booking.appointmentDate) >= new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date()));
        return matchesSearch && matchesDate;
      })
      .sort((first, second) => `${dateKey(first.appointmentDate)} ${first.appointmentTime}`.localeCompare(`${dateKey(second.appointmentDate)} ${second.appointmentTime}`));
  }, [bookings.data, dateFilter, search]);

  const refreshSchedule = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeSessionQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeBookingsQueryKey() }),
    ]);
    setRefreshing(false);
  };

  const signOut = () => {
    setLogoutError('');
    logout.mutate(undefined, {
      onSuccess: async () => {
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeAttendanceTodayQueryKey(), exact: true });
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeAttendanceHistoryQueryKey(), exact: true });
        queryClient.removeQueries({ queryKey: getGetGgsEmployeeCashierSessionQueryKey(), exact: true });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeSessionQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeBookingsQueryKey() }),
        ]);
        setLocation('/employee/sign-in');
      },
      onError: () => setLogoutError('Belum dapat keluar. Periksa koneksi lalu coba lagi.'),
    });
  };

  const needsSignIn = session.isError || (session.isSuccess && !session.data.active);
  const closeSidebarAfterNavigation = () => {
    if (window.matchMedia('(max-width: 900px)').matches) setSidebarCollapsed(true);
  };

  return (
    <main className={`employee-workspace employee-schedule employee-cms${sidebarCollapsed ? ' employee-cms--collapsed' : ''}`} data-testid="page-employee-schedule">
      {authenticated && (
        <>
          <aside
            id="employee-workspace-nav"
            className={`employee-cms__sidebar${sidebarCollapsed ? ' employee-cms__sidebar--collapsed' : ''}`}
            aria-label="Navigasi karyawan"
            data-testid="employee-sidebar"
          >
            <Link href="/employee/overview" className="employee-sidebar__brand" aria-label="GGS workspace">
              <span className="employee-brand__mark" aria-hidden="true">G</span>
              <span className="employee-sidebar__brand-copy"><strong>GGS</strong><small>HAIR STUDIO</small></span>
            </Link>
            <nav className="employee-sidebar__nav">
              {employeeMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentMenu.href === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`employee-sidebar__item${isActive ? ' employee-sidebar__item--active' : ''}`}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    title={sidebarCollapsed ? item.label : undefined}
                    onClick={closeSidebarAfterNavigation}
                    data-testid={`link-employee-menu-${item.href.split('/').pop()}`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="employee-sidebar__account" title={session.data?.name}>
              <span className="employee-sidebar__avatar" aria-hidden="true">
                {session.data?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </span>
              <span className="employee-sidebar__account-copy">
                <strong>{session.data?.name}</strong>
                <small>ID {session.data?.employeeId}</small>
              </span>
            </div>
          </aside>
          {!sidebarCollapsed && (
            <button
              type="button"
              className="employee-sidebar-backdrop"
              aria-label="Tutup menu"
              onClick={() => setSidebarCollapsed(true)}
            />
          )}
        </>
      )}

      <div className="employee-cms__main">
        <header className="employee-schedule__topbar employee-cms__topbar">
          {authenticated ? (
            <>
              <button
                type="button"
                className="employee-menu-toggle"
                aria-label={sidebarCollapsed ? 'Tampilkan menu' : 'Sembunyikan menu'}
                aria-controls="employee-workspace-nav"
                aria-expanded={!sidebarCollapsed}
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                data-testid="button-employee-sidebar-toggle"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
              <div className="employee-cms__breadcrumb">
                <strong>{currentMenu.label}</strong>
              </div>
            </>
          ) : (
            <Link href="/" className="employee-brand" data-testid="link-schedule-home">
              <span className="employee-brand__mark" aria-hidden="true">G</span>
              <span><strong>GGS</strong><small>HAIR STUDIO</small></span>
            </Link>
          )}
          <div className="employee-schedule__topbar-actions">
            <button type="button" className="employee-logout-button" onClick={signOut} disabled={logout.isPending || needsSignIn} data-testid="button-employee-sign-out">
              <LogOut size={15} aria-hidden="true" />
              {logout.isPending ? 'Keluar…' : 'Keluar'}
            </button>
          </div>
        </header>

        {session.isLoading ? (
          <div className="employee-schedule__loading">
            <div className="employee-schedule__loading-line" />
            <EmployeeBookingsSkeleton />
          </div>
        ) : needsSignIn ? (
          <section className="employee-protected-message" role="alert" data-testid="status-employee-session-required">
            <span className="employee-protected-message__icon"><ShieldCheck size={20} aria-hidden="true" /></span>
            <div>
              <p className="employee-kicker">SESI TIDAK AKTIF</p>
              <h1>Masuk untuk melanjutkan.</h1>
              <p>Ruang kerja dan absensi hanya tersedia untuk karyawan yang sudah masuk.</p>
            </div>
            <Link
              href={`/employee/sign-in?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`}
              className="employee-primary-button"
              data-testid="link-schedule-sign-in"
            >
              Masuk karyawan <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        ) : currentMenu.href === '/employee/overview' ? (
          <EmployeeOverview
            employeeName={session.data?.name ?? 'Karyawan'}
            bookings={bookings.data ?? []}
            isLoading={bookings.isLoading}
            isError={bookings.isError}
            onRetry={() => void refreshSchedule()}
          />
        ) : currentMenu.href === '/employee/schedule' ? (
          <div className="employee-schedule__content">
            <section className="employee-schedule__heading">
              <div>
                <p className="employee-kicker">AGENDA STUDIO</p>
                <h1>Jadwal <em>studio.</em></h1>
                <p className="employee-schedule__welcome">Halo, {session.data?.name} <span>· ID {session.data?.employeeId}</span>. Berikut seluruh booking studio yang perlu diperhatikan.</p>
              </div>
              <button
                type="button"
                className="employee-refresh-button"
                onClick={refreshSchedule}
                disabled={refreshing || bookings.isFetching || session.isFetching}
                data-testid="button-refresh-employee-schedule"
              >
                <RefreshCw size={15} aria-hidden="true" className={refreshing || bookings.isFetching ? 'is-spinning' : ''} />
                Perbarui jadwal
              </button>
            </section>

            <section className="employee-schedule__summary" aria-label="Ringkasan jadwal">
              <div className="employee-schedule__summary-icon"><CalendarDays size={19} aria-hidden="true" /></div>
              <div><span>BOOKING TERLIHAT</span><strong>{bookings.isLoading ? '—' : (bookings.data?.length ?? 0).toString().padStart(2, '0')}</strong></div>
              <p>Semua booking tampil untuk tim studio. Booking belum ditetapkan ke karyawan tertentu.</p>
            </section>

            <section className="employee-bookings" aria-label="Daftar booking studio">
              <div className="employee-bookings__toolbar">
                <div className="employee-bookings__title">
                  <h2>Agenda booking</h2>
                  <span>{sortedBookings.length} tampil</span>
                </div>
                <div className="employee-bookings__filters">
                  <label className="employee-search">
                    <Search size={15} aria-hidden="true" />
                    <span className="sr-only">Cari booking</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cari nama, telepon, layanan"
                      data-testid="input-search-employee-bookings"
                    />
                  </label>
                  <label className="employee-date-filter">
                    <span className="sr-only">Filter tanggal booking</span>
                    <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as 'all' | 'today' | 'upcoming')} data-testid="select-employee-booking-date">
                      <option value="all">Semua tanggal</option>
                      <option value="today">Hari ini</option>
                      <option value="upcoming">Hari ini & berikutnya</option>
                    </select>
                  </label>
                </div>
              </div>

              {bookings.isLoading ? (
                <EmployeeBookingsSkeleton />
              ) : bookings.isError ? (
                <div className="employee-bookings__error" role="alert" data-testid="status-employee-bookings-error">
                  <div><strong>Jadwal belum dapat dimuat.</strong><p>Periksa koneksi, lalu coba perbarui data booking.</p></div>
                  <button type="button" onClick={refreshSchedule} disabled={refreshing}>Coba lagi</button>
                </div>
              ) : sortedBookings.length ? (
                <div className="employee-booking-list">
                  {sortedBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              ) : (
                <div className="employee-bookings__empty" data-testid="status-employee-bookings-empty">
                  <div className="employee-bookings__empty-mark"><CalendarDays size={21} aria-hidden="true" /></div>
                  <h3>{bookings.data?.length ? 'Tidak ada booking yang cocok.' : 'Belum ada booking.'}</h3>
                  <p>{bookings.data?.length ? 'Ubah kata pencarian atau filter tanggal untuk melihat agenda lain.' : 'Booking yang masuk ke studio akan muncul di halaman ini.'}</p>
                  {search || dateFilter !== 'all' ? <button type="button" onClick={() => { setSearch(''); setDateFilter('all'); }}>Hapus filter</button> : null}
                </div>
              )}
            </section>
          </div>
        ) : currentMenu.href === '/employee/attendance' ? (
          <EmployeeAttendancePage employeeName={session.data?.name ?? 'Karyawan'} />
        ) : currentMenu.href === '/employee/cashier' ? (
          <EmployeeCashierPage />
        ) : (
          <EmployeeModulePlaceholder item={currentMenu} />
        )}

        {authenticated && logoutError && <p className="employee-form-error employee-schedule__logout-error" role="alert">{logoutError}</p>}
      </div>
    </main>
  );
}
