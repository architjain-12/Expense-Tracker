interface Props { label: string; value: string; hint?: string; compact?: boolean; }
export default function MetricCard({ label, value, hint, compact }: Props) {
  return <div className={`metric-card ${compact ? 'compact' : ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {hint && <small>{hint}</small>}
  </div>;
}
