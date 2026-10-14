import { useState, type KeyboardEvent } from 'react';
import { ArrowRight, BriefcaseBusiness, UserRound } from 'lucide-react';
import './_group.css';
import './Current.css';

function MyGgsPage() {
  const [profileType, setProfileType] = useState<'consumer' | 'employee'>('consumer');

  const handleProfileTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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

  const preventPreviewNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault();

  return (
    <div className="clearer-page profile-current">
      <div className="inner-page" data-testid="page-my-ggs">
        <section className="inner-page-hero">
          <div>
            <p className="clearer-kicker">GGS / MY GGS</p>
            <h1>My GGS,<br /><em>pilih profil.</em></h1>
          </div>
          <p className="inner-page-intro">Pilih Pengguna (Konsumen) atau Karyawan. Data profil dan riwayat belum terhubung.</p>
          <span className="inner-page-stamp">GGS<br />STUDIO</span>
        </section>

        <div className="inner-page-content">
          <div
            className="myggs-profile-choice"
            role="tablist"
            aria-label="Pilih jenis profil"
            onKeyDown={handleProfileTabKeyDown}
            data-testid="group-my-ggs-profile-type"
          >
            <button
              type="button"
              className="myggs-profile-option"
              id="tab-my-ggs-profile-consumer"
              role="tab"
              aria-selected={profileType === 'consumer'}
              aria-controls="panel-my-ggs-profile-consumer"
              tabIndex={profileType === 'consumer' ? 0 : -1}
              onClick={() => setProfileType('consumer')}
              data-testid="button-my-ggs-profile-consumer"
            >
              <span className="myggs-profile-option-icon" aria-hidden="true"><UserRound size={19} /></span>
              <span className="myggs-profile-option-copy"><strong>Pengguna</strong><small>Konsumen</small></span>
            </button>
            <button
              type="button"
              className="myggs-profile-option"
              id="tab-my-ggs-profile-employee"
              role="tab"
              aria-selected={profileType === 'employee'}
              aria-controls="panel-my-ggs-profile-employee"
              tabIndex={profileType === 'employee' ? 0 : -1}
              onClick={() => setProfileType('employee')}
              data-testid="button-my-ggs-profile-employee"
            >
              <span className="myggs-profile-option-icon" aria-hidden="true"><BriefcaseBusiness size={19} /></span>
              <span className="myggs-profile-option-copy"><strong>Karyawan</strong><small>Tim GGS</small></span>
            </button>
          </div>

          <div
            id="panel-my-ggs-profile-consumer"
            className="myggs-profile-panel"
            role="tabpanel"
            aria-labelledby="tab-my-ggs-profile-consumer"
            tabIndex={0}
            hidden={profileType !== 'consumer'}
            data-testid="panel-my-ggs-profile-consumer"
          >
            <section className="unavailable-panel myggs-empty" data-testid="status-my-ggs-unavailable">
              <div className="empty-ornament"><UserRound size={25} /></div>
              <span className="panel-index">MY GGS / DATA PENGGUNA BELUM TERHUBUNG</span>
              <h2>Riwayat kunjunganmu<br />belum bisa ditampilkan.</h2>
              <p>Website ini belum memiliki akun pelanggan, riwayat booking, atau data member. Permintaan janji dikelola oleh tim studio dan belum tampil sebagai riwayat pribadi.</p>
              <a href="#book" className="clearer-primary-button" onClick={preventPreviewNavigation}>
                Ajukan janji <ArrowRight size={16} />
              </a>
            </section>
            <div className="myggs-record-grid">
              {[
                { label: 'Booking mendatang', value: 'Belum terhubung', note: 'Data booking akun belum tersedia' },
                { label: 'Riwayat kunjungan', value: 'Belum terhubung', note: 'Data kunjungan pelanggan belum tersedia' },
                { label: 'Voucher pribadi', value: 'Belum tersedia', note: 'Voucher pribadi belum terhubung' },
                { label: 'Preferensi gaya', value: 'Belum disimpan', note: 'Website ini belum menyimpan data profil' },
              ].map((item, index) => (
                <article key={item.label} data-testid={`card-my-ggs-${index}`}>
                  <span>0{index + 1} / {item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </div>

          <div
            id="panel-my-ggs-profile-employee"
            className="myggs-profile-panel"
            role="tabpanel"
            aria-labelledby="tab-my-ggs-profile-employee"
            tabIndex={0}
            hidden={profileType !== 'employee'}
            data-testid="panel-my-ggs-profile-employee"
          >
            <section className="unavailable-panel myggs-empty" data-testid="status-my-ggs-employee-unavailable">
              <div className="empty-ornament"><BriefcaseBusiness size={25} /></div>
              <span className="panel-index">PROFIL KARYAWAN / BELUM TERHUBUNG</span>
              <h2>Informasi karyawan<br />belum tersedia.</h2>
              <p>Akun dan informasi karyawan belum tersedia di website pengunjung.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Current() {
  return <MyGgsPage />;
}
