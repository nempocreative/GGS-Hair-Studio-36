import './_group.css';
import './RoundHair.css';

function MensGroomingScissors() {
  return (
    <svg
      className="ggs-mens-scissors"
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Scissors"
    >
      <path
        d="m13.2 13.2 13.1-9.1m-13 14.8 13 9.1M14.3 16 27 16"
        stroke="#873e38"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.4 15.4a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm0-5a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z"
        stroke="#873e38"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RoundHair() {
  return (
    <main className="ggs-icon-preview">
      <a
        className="ggs-quick-menu-item ggs-menu-mens"
        href="/mens-grooming"
        aria-label="Men's Grooming"
        onClick={(event) => event.preventDefault()}
      >
        <span className="ggs-quick-menu-icon ggs-mens-round" aria-hidden="true">
          <img
            className="ggs-mens-hair-cap"
            src="/__mockup/images/ggs-mens-hair.png"
            alt=""
            draggable={false}
          />
          <span className="ggs-mens-scissors-badge">
            <MensGroomingScissors />
          </span>
        </span>
        <span>Men&apos;s Grooming</span>
      </a>
    </main>
  );
}
