import './_group.css';
import './RoundHair.css';

export function RoundHair() {
  return (
    <main className="ggs-icon-preview">
      <a
        className="ggs-quick-menu-item ggs-menu-mens"
        href="/mens-grooming"
        aria-label="Men's Grooming"
        onClick={(event) => event.preventDefault()}
      >
        <img
          className="ggs-mens-full-image"
          src="/__mockup/images/mens-grooming-glossy-scissors.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <span>Men&apos;s Grooming</span>
      </a>
    </main>
  );
}
