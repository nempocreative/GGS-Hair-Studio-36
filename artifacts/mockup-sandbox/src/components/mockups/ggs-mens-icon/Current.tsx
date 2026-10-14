import './_group.css';

const fadeHair = {
  back: 'M12 27C9 20 9 12 14 7c3-3 6-5 11-5 8 0 13 6 13 14 0 5-1 9-3 13l-4-8c-5 2-11 2-16 0Z',
  fringe: 'M13 19C11 9 16 2 24 2s13 7 11 17c-5-1-8-4-11-8-3 4-6 7-11 8Z',
};

function HairModelMenuIcon() {
  return (
    <svg
      className="ggs-quick-menu-avatar"
      width="70"
      height="70"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 48c1.3-6.5 6.1-10.5 13.7-12.1l5.8-1.2c1.1 2.5 2.6 3.8 4.5 3.8s3.4-1.3 4.5-3.8l5.8 1.2C41.9 37.5 46.7 41.5 48 48Z"
        fill="var(--quick-icon-edge, #382a27)"
      />
      <path d={fadeHair.back} fill="#382a27" />
      <path d="M20 34.5v5.2c2 2 6 2 8 0v-5.2Z" fill="#e6b593" />
      <path
        d="M14.2 19.5c0-7.1 3.8-11.8 9.8-11.8s9.8 4.7 9.8 11.8v7.2c0 7.2-4.5 12.4-9.8 12.4s-9.8-5.2-9.8-12.4Z"
        fill="#f1c9a7"
      />
      <path d="M14.7 22c-2.1-1.2-3.6.2-2.7 2.6.6 1.6 1.7 2.3 3.3 2m17.4-4.6c2.1-1.2 3.6.2 2.7 2.6-.6 1.6-1.7 2.3-3.3 2" fill="#e9b994" />
      <path d={fadeHair.fringe} fill="#382a27" />
      <path
        d="M17.2 24.8c1.3-.9 3-.9 4.3 0m6.8 0c1.3-.9 3-.9 4.3 0"
        fill="none"
        stroke="#765043"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <ellipse cx="19.3" cy="27" rx="1" ry="1.3" fill="#382a27" />
      <ellipse cx="28.7" cy="27" rx="1" ry="1.3" fill="#382a27" />
      <path d="M24 27.5v3.2c.5.5 1 .5 1.5.2" fill="none" stroke="#ac765c" strokeWidth="1" strokeLinecap="round" />
      <path d="M21.2 33.1c1.8 1 3.8 1 5.6 0" fill="none" stroke="#a65f51" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M17 30.5c1 .7 2 .9 3 .7m11-.7c-1 .7-2 .9-3 .7" fill="none" stroke="#de9f83" strokeWidth="1.3" strokeLinecap="round" opacity=".58" />
    </svg>
  );
}

export function Current() {
  return (
    <main className="ggs-icon-preview">
      <a
        className="ggs-quick-menu-item ggs-menu-mens"
        href="/mens-grooming"
        aria-label="Men's Grooming"
        onClick={(event) => event.preventDefault()}
      >
        <span className="ggs-quick-menu-icon quick-tone-rose" aria-hidden="true">
          <HairModelMenuIcon />
        </span>
        <span>Men&apos;s Grooming</span>
      </a>
    </main>
  );
}
