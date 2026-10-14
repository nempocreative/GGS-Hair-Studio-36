import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { BriefcaseBusiness, Check, UserRound } from 'lucide-react';
import './_group.css';
import './DemoLogin.css';

type ProfileType = 'consumer' | 'employee';

export function DemoLogin() {
  const [profileType, setProfileType] = useState<ProfileType>('consumer');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [identity, setIdentity] = useState({ id: '', name: '' });
  const profileRefs = useRef<Record<ProfileType, HTMLButtonElement | null>>({
    consumer: null,
    employee: null,
  });

  const handleProfileKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next: ProfileType = event.key === 'Home'
      ? 'consumer'
      : event.key === 'End'
        ? 'employee'
        : profileType === 'consumer' ? 'employee' : 'consumer';
    setProfileType(next);
    profileRefs.current[next]?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIdentity({ id: id.trim(), name: name.trim() });
    setSignedIn(true);
  };

  const handleExit = () => {
    setSignedIn(false);
    setIdentity({ id: '', name: '' });
    setId('');
    setName('');
  };

  return (
    <main className="ggs-demo" data-testid="page-my-ggs-demo">
      <section className="ggs-demo__card" aria-label="My GGS">
        <header className="ggs-demo__header">
          <div className="ggs-demo__brand" aria-label="GGS Hair Studio">
            <span className="ggs-demo__brand-mark" aria-hidden="true">G</span>
            <span className="ggs-demo__brand-name">GGS <small>HAIR STUDIO</small></span>
          </div>
          <span className="ggs-demo__demo-tag">DEMO</span>
        </header>

        <div className="ggs-demo__content">
          <h1>My GGS</h1>
          {signedIn ? (
            <section className="ggs-demo__signed-in" aria-live="polite" data-testid="status-my-ggs-demo-signed-in">
              <span className="ggs-demo__signed-mark" aria-hidden="true"><Check size={17} /></span>
              <div className="ggs-demo__role">
                {profileType === 'consumer' ? <UserRound size={17} aria-hidden="true" /> : <BriefcaseBusiness size={17} aria-hidden="true" />}
                <strong>{profileType === 'consumer' ? 'Pengguna' : 'Karyawan'}</strong>
              </div>
              <dl className="ggs-demo__identity">
                <div><dt>Nama</dt><dd>{identity.name}</dd></div>
                <div><dt>ID</dt><dd>{identity.id}</dd></div>
              </dl>
              <button className="ggs-demo__return" type="button" onClick={handleExit}>
                Kembali ke login
              </button>
            </section>
          ) : (
            <>
              <div
                className="ggs-demo__profiles"
                role="radiogroup"
                aria-label="Pilih profil"
                onKeyDown={handleProfileKeyDown}
                data-testid="group-my-ggs-demo-profile-type"
              >
                <button
                  ref={(element) => { profileRefs.current.consumer = element; }}
                  type="button"
                  className="ggs-demo__profile"
                  role="radio"
                  aria-checked={profileType === 'consumer'}
                  tabIndex={profileType === 'consumer' ? 0 : -1}
                  onClick={() => setProfileType('consumer')}
                  data-testid="button-my-ggs-demo-consumer"
                >
                  <UserRound size={17} aria-hidden="true" />
                  <span>Pengguna</span>
                  <span className="ggs-demo__profile-check" aria-hidden="true">{profileType === 'consumer' && <Check size={13} />}</span>
                </button>
                <button
                  ref={(element) => { profileRefs.current.employee = element; }}
                  type="button"
                  className="ggs-demo__profile"
                  role="radio"
                  aria-checked={profileType === 'employee'}
                  tabIndex={profileType === 'employee' ? 0 : -1}
                  onClick={() => setProfileType('employee')}
                  data-testid="button-my-ggs-demo-employee"
                >
                  <BriefcaseBusiness size={17} aria-hidden="true" />
                  <span>Karyawan</span>
                  <span className="ggs-demo__profile-check" aria-hidden="true">{profileType === 'employee' && <Check size={13} />}</span>
                </button>
              </div>

              <form className="ggs-demo__form" onSubmit={handleSubmit} data-testid="form-my-ggs-demo-login">
                <label className="ggs-demo__field">
                  <span>ID</span>
                  <input
                    autoComplete="username"
                    name="id"
                    value={id}
                    onChange={(event) => setId(event.target.value)}
                    pattern=".*\S.*"
                    required
                  />
                </label>
                <label className="ggs-demo__field">
                  <span>Nama</span>
                  <input
                    autoComplete="name"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    pattern=".*\S.*"
                    required
                  />
                </label>
                <label className="ggs-demo__field">
                  <span>Password</span>
                  <input autoComplete="current-password" name="password" type="password" required />
                </label>
                <button className="ggs-demo__submit" type="submit" data-testid="button-my-ggs-demo-submit">Masuk</button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
