interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Logo({ size = 32, color = 'var(--accent)', className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Aux logo"
      className={className}
    >
      <path
        d="M16 3C16 3 14 3 14 5V7H18V5C18 3 16 3 16 3Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="13" y="7" width="6" height="2" rx="0.5" stroke={color} strokeWidth="1.5" />
      <rect x="14" y="9" width="4" height="5" stroke={color} strokeWidth="1.5" />
      <rect x="13" y="14" width="6" height="2" rx="0.5" stroke={color} strokeWidth="1.5" />
      <rect x="14" y="16" width="4" height="6" stroke={color} strokeWidth="1.5" />
      <path
        d="M12 22H20V26C20 28 18 29 16 29C14 29 12 28 12 26V22Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 29V31" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface LogoWithTextProps extends LogoProps {
  textClassName?: string;
}

export function LogoWithText({ size = 28, color, className, textClassName }: LogoWithTextProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Logo size={size} color={color} />
      <span className={`text-xl font-bold tracking-tight text-text ${textClassName ?? ''}`}>
        Aux
      </span>
    </div>
  );
}
