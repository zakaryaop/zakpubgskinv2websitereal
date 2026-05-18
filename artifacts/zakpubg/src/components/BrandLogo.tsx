type Props = { className?: string; size?: number };

export default function BrandLogo({ className = "", size = 32 }: Props) {
  const id = "zps-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#f0abfc" />
        </linearGradient>
      </defs>
      {/* Hex shield */}
      <path
        d="M32 3 L56 16 L56 42 L32 61 L8 42 L8 16 Z"
        fill={`url(#${id})`}
        stroke={`url(#${id}-stroke)`}
        strokeWidth="1.5"
      />
      {/* Inner glow */}
      <path
        d="M32 9 L51 19 L51 39 L32 54 L13 39 L13 19 Z"
        fill="#0a0a14"
        opacity="0.55"
      />
      {/* Stylized Z */}
      <path
        d="M22 22 L42 22 L42 27 L30 39 L42 39 L42 44 L22 44 L22 39 L34 27 L22 27 Z"
        fill={`url(#${id}-stroke)`}
      />
      {/* Crown notch / sparkle */}
      <circle cx="32" cy="14" r="2" fill="#fde047" />
    </svg>
  );
}
