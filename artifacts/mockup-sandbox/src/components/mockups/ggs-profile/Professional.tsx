import { useState, type KeyboardEvent } from 'react';
import { ArrowRight, BriefcaseBusiness, CalendarClock, ClipboardList, TicketPercent, UserRound } from 'lucide-react';
import './_group.css';
import './Professional.css';

type ProfileType = 'consumer' | 'employee';

const consumerRecords = [
  { label: 'Booking mendatang', value: 'Belum terhubung', note: 'Data booking akun belum tersedia', Icon: CalendarClock },
  { label: 'Riwayat kunjungan', value: 'Belum terhubung', note: 'Data kunjungan pelanggan belum tersedia', Icon: ClipboardList },
  { label: 'Voucher pribadi', value: 'Belum tersedia', note: 'Voucher pribadi belum terhubung', Icon: TicketPercent },
  { label: 'Preferensi gaya', value: 'Belum disimpan', note: 'Website ini belum menyimpan data profil', Icon: UserRound },
];

export function Professional() {
  const [profileType, setProfileType] = useState<ProfileType>('consumer');

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const nextType = event.key === 'Home'
      ? 'consumer'
      : event.key === 'End'
        ? 'employee'
        : profileType === 'consumer'
          ? 'employee'
          : 'consumer';

    setProfileType(nextType);
    document.getElementById(`tab-my-ggs-profile-${nextType}`)?.focus();
  };

  return (
    <main className="ggs-professional">
      <div className="ggs-professional__page" data-testid="page-my-ggs">
        <header className="ggs-professional__hero">
          <div className="ggs-professional__hero-copy">
            <p className="ggs-professional__eyebrow">GGS <span>/</span> MY GGS</p>
            <h1>My GGS,<br /><em>pilih profil.</em></h1>
          </div>
          <div className="ggs-professional__intro">
            <span className="ggs-professional__intro-mark" aria-hidden="true"><UserRound size={19} /></span>
            <p>Pilih Pengguna (Konsumen) atau Karyawan. Data profil dan riwayat belum terhubung.</p>
          </div>
          <div className="ggs-professional__studio-note">
            <span>RUANG PERSONAL</span>
            <strong>GGS Hair Studio</strong>
          </div>
        </header>

        <section className="ggs-professional__workspace" aria-label="Profil My GGS">
          <div
            className="ggs-professional__tabs"
            role="tablist"
            aria-label="Pilih jenis profil"
            onKeyDown={handleTabKeyDown}
            data-testid="group-my-ggs-profile-type"
          >
            <button
              type="button"
              className="ggs-professional__tab"
              id="tab-my-ggs-profile-consumer"
              role="tab"
              aria-selected={profileType === 'consumer'}
              aria-controls="panel-my-ggs-profile-consumer"
              tabIndex={profileType === 'consumer' ? 0 : -1}
              onClick={() => setProfileType('consumer')}
              data-testid="button-my-ggs-profile-consumer"
            >
              <span className="ggs-professional__tab-icon" aria-hidden="true"><UserRound size={18} /></span>
              <span className="ggs-professional__tab-label"><strong>Pengguna</strong><small>Konsumen</small></span>
              <span className="ggs-professional__tab-state" aria-hidden="true">{profileType === 'consumer' ? 'TERPILIH' : ''}</span>
            </button>
            <button
              type="button"
              className="ggs-professional__tab"
              id="tab-my-ggs-profile-employee"
              role="tab"
              aria-selected={profileType === 'employee'}
              aria-controls="panel-my-ggs-profile-employee"
              tabIndex={profileType === 'employee' ? 0 : -1}
              onClick={() => setProfileType('employee')}
              data-testid="button-my-ggs-profile-employee"
            >
              <span className="ggs-professional__tab-icon" aria-hidden="true"><BriefcaseBusiness size={18} /></span>
              <span className="ggs-professional__tab-label"><strong>Karyawan</strong><small>Tim GGS</small></span>
              <span className="ggs-professional__tab-state" aria-hidden="true">{profileType === 'employee' ? 'TERPILIH' : ''}</span>
            </button>
          </div>

          <div
            id="panel-my-ggs-profile-consumer"
            className="ggs-professional__panel"
            role="tabpanel"
            aria-labelledby="tab-my-ggs-profile-consumer"
            tabIndex={0}
            hidden={profileType !== 'consumer'}
            data-testid="panel-my-ggs-profile-consumer"
          >
            <section className="ggs-professional__consumer-intro" data-testid="status-my-ggs-unavailable">
              <div className="ggs-professional__section-label">
                <span className="ggs-professional__label-rule" />
                <span>PROFIL PENGGUNA</span>
              </div>
              <div className="ggs-professional__availability">
                <span className="ggs-professional__availability-dot" aria-hidden="true" />
                <span>Belum terhubung</span>
              </div>
              <h2>Riwayat kunjunganmu<br />belum bisa ditampilkan.</h2>
              <p>Website ini belum memiliki akun pelanggan, riwayat booking, atau data member. Permintaan janji dikelola oleh tim studio dan belum tampil sebagai riwayat pribadi.</p>
              <a
                href="#book"
                className="ggs-professional__booking-link"
                onClick={(event) => event.preventDefault()}
              >
                <span>Ajukan janji</span><ArrowRight size={17} aria-hidden="true" />
              </a>
            </section>

            <section className="ggs-professional__records" aria-label="Data profil pengguna yang belum tersedia">
              <div className="ggs-professional__records-heading">
                <h3>Yang belum terhubung</h3>
                <p>Belum ada data pribadi yang tersimpan di website.</p>
              </div>
              <div className="ggs-professional__record-list">
                {consumerRecords.map(({ label, value, note, Icon }, index) => (
                  <article className="ggs-professional__record" key={label} data-testid={`card-my-ggs-${index}`}>
                    <span className="ggs-professional__record-icon" aria-hidden="true"><Icon size={17} /></span>
                    <div className="ggs-professional__record-copy">
                      <span className="ggs-professional__record-label">{label}</span>
                      <strong>{value}</strong>
                      <p>{note}</p>
                    </div>
                    <span className="ggs-professional__record-marker" aria-hidden="true" />
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div
            id="panel-my-ggs-profile-employee"
            className="ggs-professional__panel ggs-professional__panel--employee"
            role="tabpanel"
            aria-labelledby="tab-my-ggs-profile-employee"
            tabIndex={0}
            hidden={profileType !== 'employee'}
            data-testid="panel-my-ggs-profile-employee"
          >
            <section className="ggs-professional__employee-intro" data-testid="status-my-ggs-employee-unavailable">
              <div className="ggs-professional__employee-symbol" aria-hidden="true"><BriefcaseBusiness size={21} /></div>
              <div className="ggs-professional__employee-copy">
                <div className="ggs-professional__section-label">
                  <span className="ggs-professional__label-rule" />
                  <span>PROFIL KARYAWAN</span>
                </div>
                <div className="ggs-professional__availability">
                  <span className="ggs-professional__availability-dot" aria-hidden="true" />
                  <span>Belum terhubung</span>
                </div>
                <h2>Informasi karyawan<br />belum tersedia.</h2>
                <p>Akun dan informasi karyawan belum tersedia di website pengunjung.</p>
              </div>
              <aside className="ggs-professional__employee-note">
                <span>WEBSITE PENGUNJUNG</span>
                <p>Area ini belum menyediakan informasi untuk tim GGS.</p>
              </aside>
            </section>
          </div>
        </section>

        <footer className="ggs-professional__footer">
          <span>GGS HAIR STUDIO</span>
          <p>Informasi profil saat ini belum terhubung ke website.</p>
        </footer>
      </div>
    </main>
  );
}
