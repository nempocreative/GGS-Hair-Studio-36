import { useState } from "react";
import { ArrowRight, Banknote, BarChart3, CalendarDays, Clock3, LayoutDashboard, LogOut, Menu, Package, UsersRound } from "lucide-react";
import "./_group.css";

type Booking = {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  customerName: string;
  serviceName: string;
  phone: string;
  notes: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
};

const employeeMenuItems = [
  { href: "/employee/overview", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/employee/schedule", label: "Jadwal booking", icon: CalendarDays },
  { href: "/employee/attendance", label: "Absensi", icon: Clock3 },
  { href: "/employee/cashier", label: "Kasir", icon: Banknote },
  { href: "/employee/customers", label: "Pelanggan", icon: UsersRound },
  { href: "/employee/stock", label: "Stok produk", icon: Package },
  { href: "/employee/reports", label: "Laporan", icon: BarChart3 },
] as const;

const statusLabels: Record<Booking["status"], string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function displayDate(value: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { ...options, timeZone: "Asia/Jakarta" }).format(parsed);
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function jakartaToday() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sampleBookings(): Booking[] {
  const today = jakartaToday();
  return [
    { id: 101, appointmentDate: today, appointmentTime: "10.00", customerName: "Nadia Putri", serviceName: "Hair cut & wash", phone: "0812-3456-7810", notes: "Potongan sebahu, sedikit layer.", status: "confirmed" },
    { id: 102, appointmentDate: today, appointmentTime: "13.30", customerName: "Rizky Pratama", serviceName: "Classic cut", phone: "0813-2201-4468", notes: "Minta sisi tetap rapi dan natural.", status: "pending" },
    { id: 103, appointmentDate: shiftDate(today, 1), appointmentTime: "09.30", customerName: "Intan Permata", serviceName: "Hair treatment", phone: "0857-1134-2290", notes: "Rambut kering setelah pewarnaan.", status: "confirmed" },
    { id: 104, appointmentDate: shiftDate(today, 3), appointmentTime: "15.00", customerName: "Dewi Anggraini", serviceName: "Blow dry", phone: "0819-7750-3201", notes: "", status: "pending" },
  ];
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <article className="employee-booking-card" data-testid={`card-employee-booking-${booking.id}`}>
      <div className="employee-booking-card__time">
        <span>{booking.appointmentTime}</span>
        <small>{displayDate(booking.appointmentDate, { day: "numeric", month: "short" })}</small>
      </div>
      <div className="employee-booking-card__main">
        <div className="employee-booking-card__title">
          <div>
            <h3>{booking.customerName}</h3>
            <p>{booking.serviceName}</p>
          </div>
          <span className={`employee-status employee-status--${booking.status}`}>{statusLabels[booking.status]}</span>
        </div>
        <div className="employee-booking-card__details">
          <span><Clock3 size={14} aria-hidden="true" /> {booking.phone}</span>
          {booking.notes.trim() && <p>{booking.notes}</p>}
        </div>
      </div>
    </article>
  );
}

function EmployeeOverview({ employeeName, bookings }: { employeeName: string; bookings: Booking[] }) {
  const today = jakartaToday();
  const todayBookings = bookings.filter((booking) => dateKey(booking.appointmentDate) === today);
  const pendingBookings = bookings.filter((booking) => booking.status === "pending");
  const latestBookings = [...bookings]
    .sort((first, second) => `${dateKey(first.appointmentDate)} ${first.appointmentTime}`.localeCompare(`${dateKey(second.appointmentDate)} ${second.appointmentTime}`))
    .filter((booking) => dateKey(booking.appointmentDate) >= today)
    .slice(0, 3);

  return (
    <div className="employee-dashboard" data-testid="employee-overview">
      <section className="employee-dashboard__heading">
        <div>
          <h1>Halo, {employeeName}</h1>
          <p>{displayDate(today, { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <a href="#" onClick={(event) => event.preventDefault()} className="employee-primary-button" data-testid="link-overview-schedule">
          Jadwal booking <ArrowRight size={15} aria-hidden="true" />
        </a>
      </section>

      <section className="employee-dashboard__stats" aria-label="Ringkasan booking">
        <article className="employee-dashboard__stat">
          <span>Booking hari ini</span>
          <strong>{todayBookings.length}</strong>
        </article>
        <article className="employee-dashboard__stat">
          <span>Menunggu konfirmasi</span>
          <strong>{pendingBookings.length}</strong>
        </article>
        <article className="employee-dashboard__stat">
          <span>Total booking</span>
          <strong>{bookings.length}</strong>
        </article>
      </section>

      <section className="employee-dashboard__activity" aria-labelledby="employee-overview-activity-title">
        <div className="employee-dashboard__section-title">
          <h2 id="employee-overview-activity-title">Booking terdekat</h2>
        </div>
        {latestBookings.length ? (
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

export function Current() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches,
  );
  const bookings = sampleBookings();
  const employeeName = "Ayu Lestari";
  const employeeId = "GGS-024";

  return (
    <main className={`ggs-employee-preview employee-workspace employee-schedule employee-cms${sidebarCollapsed ? " employee-cms--collapsed" : ""}`} data-testid="page-employee-overview">
      <aside
        id="employee-workspace-nav"
        className={`employee-cms__sidebar${sidebarCollapsed ? " employee-cms__sidebar--collapsed" : ""}`}
        aria-label="Navigasi karyawan"
        data-testid="employee-sidebar"
      >
        <a href="#" onClick={(event) => event.preventDefault()} className="employee-sidebar__brand" aria-label="GGS workspace">
          <span className="employee-brand__mark" aria-hidden="true">G</span>
          <span className="employee-sidebar__brand-copy"><strong>GGS</strong><small>HAIR STUDIO</small></span>
        </a>
        <nav className="employee-sidebar__nav">
          {employeeMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/employee/overview";
            return (
              <a
                key={item.href}
                href="#"
                onClick={(event) => event.preventDefault()}
                className={`employee-sidebar__item${isActive ? " employee-sidebar__item--active" : ""}`}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
        <div className="employee-sidebar__account" title={employeeName}>
          <span className="employee-sidebar__avatar" aria-hidden="true">AL</span>
          <span className="employee-sidebar__account-copy">
            <strong>{employeeName}</strong>
            <small>ID {employeeId}</small>
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

      <div className="employee-cms__main">
        <header className="employee-schedule__topbar employee-cms__topbar">
          <button
            type="button"
            className="employee-menu-toggle"
            aria-label={sidebarCollapsed ? "Tampilkan menu" : "Sembunyikan menu"}
            aria-controls="employee-workspace-nav"
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            data-testid="button-employee-sidebar-toggle"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="employee-cms__breadcrumb">
            <strong>Ringkasan</strong>
          </div>
          <div className="employee-schedule__topbar-actions">
            <button type="button" className="employee-logout-button" data-testid="button-employee-sign-out">
              <LogOut size={15} aria-hidden="true" />
              Keluar
            </button>
          </div>
        </header>
        <EmployeeOverview employeeName={employeeName} bookings={bookings} />
      </div>
    </main>
  );
}
