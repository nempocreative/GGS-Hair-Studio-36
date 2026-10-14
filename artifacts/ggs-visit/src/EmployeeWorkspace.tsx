import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, LogOut, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  getGetGgsEmployeeBookingsQueryKey,
  getGetGgsEmployeeSessionQueryKey,
  useGetGgsEmployeeBookings,
  useGetGgsEmployeeSession,
  useLoginGgsEmployee,
  useLogoutGgsEmployee,
} from '@workspace/api-client-react';
import type { GgsEmployeeBooking, LoginGgsEmployeeMutationVariables } from '@workspace/api-client-react';
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

const statusLabels: Record<GgsEmployeeBooking['status'], string> = {
  pending: 'Menunggu',
  confirmed: 'Terkonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

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
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeSessionQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetGgsEmployeeBookingsQueryKey() }),
        ]);
        setLocation('/employee/schedule');
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
          <p>Masuk untuk melihat agenda booking studio hari ini dan seterusnya.</p>
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
  const [, setLocation] = useLocation();
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

  return (
    <main className="employee-workspace employee-schedule" data-testid="page-employee-schedule">
      <header className="employee-schedule__topbar">
        <Link href="/" className="employee-brand" data-testid="link-schedule-home">
          <span className="employee-brand__mark" aria-hidden="true">G</span>
          <span><strong>GGS</strong><small>HAIR STUDIO</small></span>
        </Link>
        <div className="employee-schedule__topbar-actions">
          <span className="employee-private-label"><span /> AREA KARYAWAN</span>
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
            <h1>Masuk untuk melihat jadwal.</h1>
            <p>Jadwal studio hanya tersedia untuk karyawan yang sudah masuk.</p>
          </div>
          <Link href="/employee/sign-in" className="employee-primary-button" data-testid="link-schedule-sign-in">
            Masuk karyawan <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <div className="employee-schedule__content">
          <section className="employee-schedule__heading">
            <div>
              <p className="employee-kicker">GGS / DAILY OPERATIONS</p>
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
          {logoutError && <p className="employee-form-error employee-schedule__logout-error" role="alert">{logoutError}</p>}
          <footer className="employee-schedule__footer">
            <span>JADWAL INTERNAL / GGS</span>
            <span>Hanya baca · Data pelanggan untuk operasional studio</span>
          </footer>
        </div>
      )}
    </main>
  );
}
