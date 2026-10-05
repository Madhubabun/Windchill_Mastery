export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  label,
  className = "",
  track = "var(--surface-2)",
  color = "url(#ring-grad)",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  className?: string;
  track?: string;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={`relative inline-grid place-items-center ${className}`} style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v * 100)}% complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--mint-fill)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset var(--dur-reward) var(--ease)" }}
        />
      </svg>
      {label !== undefined && <div className="absolute inset-0 grid place-items-center text-xs font-bold">{label}</div>}
    </div>
  );
}
