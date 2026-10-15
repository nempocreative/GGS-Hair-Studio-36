import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Package,
  UserRound,
  UsersRound,
} from "lucide-react";
import "./_group.css";

const employeeMenuItems = [
  { href: "/employee/overview", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/employee/schedule", label: "Jadwal booking", icon: CalendarDays },
  { href: "/employee/attendance", label: "Absensi", icon: Clock3 },
  { href: "/employee/cashier", label: "Kasir", icon: Banknote },
  { href: "/employee/customers", label: "Pelanggan", icon: UsersRound },
  { href: "/employee/stock", label: "Stok produk", icon: Package },
  { href: "/employee/reports", label: "Laporan", icon: BarChart3 },
  { href: "/employee/profile", label: "Profil", icon: UserRound },
] as const;

function ProfileSettingsContent() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  return (
    <div className="employee-profile" data-testid="page-employee-profile">
      <section className="employee-profile__heading">
        <div>
          <p className="employee-kicker">AKUN KARYAWAN</p>
          <h1>Profil <em>akun.</em></h1>
          <p>Periksa detail akun dan perbarui kata sandi Anda.</p>
        </div>
        <span className="employee-profile__status">
          <span aria-hidden="true" />Akun aktif
        </span>
      </section>

      <div className="employee-profile__grid">
        <section className="employee-profile__card" aria-labelledby="employee-profile-details-title">
          <div className="employee-profile__card-heading">
            <div>
              <p className="employee-kicker">INFORMASI AKUN</p>
              <h2 id="employee-profile-details-title">Detail karyawan</h2>
            </div>
          </div>
          <dl className="employee-profile__details">
            <div><dt>Nama</dt><dd>Ayu Lestari</dd></div>
            <div><dt>ID karyawan</dt><dd>GGS-024</dd></div>
            <div><dt>ID akun</dt><dd>EMP-024</dd></div>
            <div><dt>Akun dibuat</dt><dd>12 Oktober 2025</dd></div>
          </dl>
          <p className="employee-profile__note">
            Nama dan ID karyawan dikelola oleh administrator. Hubungi pengelola studio jika detail ini perlu diperbaiki.
          </p>
        </section>

        <section className="employee-profile__card employee-profile__security" aria-labelledby="employee-profile-password-title">
          <div className="employee-profile__card-heading">
            <div>
              <p className="employee-kicker">KEAMANAN</p>
              <h2 id="employee-profile-password-title">Ubah kata sandi</h2>
            </div>
            <LockKeyhole size={18} aria-hidden="true" />
          </div>
          <form className="employee-profile__form" onSubmit={(event) => event.preventDefault()}>
            <input
              className="employee-profile__username"
              type="text"
              name="username"
              autoComplete="username"
              value="GGS-024"
              readOnly
              tabIndex={-1}
              aria-hidden="true"
            />
            <label htmlFor="employee-profile-current-password">Kata sandi saat ini</label>
            <input
              id="employee-profile-current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <label htmlFor="employee-profile-new-password">Kata sandi baru</label>
            <input
              id="employee-profile-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <label htmlFor="employee-profile-confirm-password">Konfirmasi kata sandi baru</label>
            <input
              id="employee-profile-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <p className="employee-profile__hint">Gunakan 8–128 karakter. Kasir akan terkunci setelah kata sandi diperbarui.</p>
            <button className="employee-primary-button" type="submit">
              <span>Simpan kata sandi</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export function ProfileSettings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches,
  );
  const employeeName = "Ayu Lestari";
  const employeeId = "GGS-024";

  return (
    <main
      className={`ggs-employee-preview employee-workspace employee-schedule employee-cms${sidebarCollapsed ? " employee-cms--collapsed" : ""}`}
      data-preview="profile"
      data-testid="page-employee-profile"
    >
      <aside
        id="employee-workspace-nav"
        className={`employee-cms__sidebar${sidebarCollapsed ? " employee-cms__sidebar--collapsed" : ""}`}
        aria-label="Navigasi karyawan"
      >
        <a href="#" onClick={(event) => event.preventDefault()} className="employee-sidebar__brand" aria-label="GGS workspace">
          <span className="employee-brand__mark" aria-hidden="true">G</span>
          <span className="employee-sidebar__brand-copy"><strong>GGS</strong><small>HAIR STUDIO</small></span>
        </a>
        <nav className="employee-sidebar__nav">
          {employeeMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/employee/profile";
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
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="employee-cms__breadcrumb"><strong>Profil</strong></div>
          <div className="employee-schedule__topbar-actions">
            <button type="button" className="employee-logout-button">
              <LogOut size={15} aria-hidden="true" />
              Keluar
            </button>
          </div>
        </header>
        <ProfileSettingsContent />
      </div>
    </main>
  );
}
