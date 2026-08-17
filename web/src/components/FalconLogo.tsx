interface FalconLogoProps {
  className?: string;
}

export function FalconLogo({ className }: FalconLogoProps) {
  return (
    <img
      src="/falcon.svg"
      alt="Falcon logo"
      className={className}
      loading="lazy"
      aria-hidden="true"
    />
  );
}

export function FalconFavicon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="favBg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#12204b" />
        <stop offset="100%" stop-color="#08142b" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="16" fill="url(#favBg)" />
    <path d="M18 24 C22 16 30 14 40 18 C46 22 50 28 48 36 C46 44 40 50 32 52 C22 54 15 49 13 39 C11 31 13 27 18 24 Z" fill="#0b203f" />
    <path d="M16 28 C20 22 26 20 34 22 C40 24 44 30 44 36 C44 42 40 46 34 48 C28 50 22 48 18 44 C14 40 14 34 16 28 Z" fill="#5a7ce0" />
    <path d="M22 32 C26 28 32 26 36 28 C40 30 42 34 42 38 C42 42 38 46 32 46 C26 46 22 42 22 38 C22 34 22 32 22 32 Z" fill="#f1f5ff" />
    <path d="M38 20 C42 18 48 20 50 24 C52 28 52 32 48 36 C44 40 38 42 34 40 C30 38 30 34 32 30 C34 26 36 22 38 20 Z" fill="#f5c15d" />
    <circle cx="40" cy="24" r="2" fill="#0c1320" />
  </svg>`;
}
