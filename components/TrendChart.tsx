'use client'
// Gráfico de linha leve (SVG puro, sem dependências).
export default function TrendChart({
  values, labels, color = '#0d9488', height = 170,
}: { values: number[]; labels: string[]; color?: string; height?: number }) {
  if (!values || values.length < 2) return null
  const w = 560, h = height, pL = 10, pR = 12, pT = 16, pB = 26
  const n = values.length
  const max = Math.max(...values) * 1.15 || 1
  const X = (i: number) => pL + (i / (n - 1)) * (w - pL - pR)
  const Y = (v: number) => pT + (1 - v / max) * (h - pT - pB)
  const line = values.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')
  const area = 'M' + X(0).toFixed(1) + ',' + (h - pB) + ' ' +
    values.map((v, i) => 'L' + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ') +
    ' L' + X(n - 1).toFixed(1) + ',' + (h - pB) + ' Z'
  const gid = 'tg' + color.replace(/[^a-z0-9]/gi, '')
  const grid = [0, .25, .5, .75, 1]
  return (
    <svg className="trend-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Gráfico de tendência">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".26" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((f, i) => {
        const y = (pT + f * (h - pT - pB)).toFixed(1)
        return <line key={i} x1={pL} y1={y} x2={w - pR} y2={y} stroke="var(--border)" strokeWidth="1" />
      })}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={X(i).toFixed(1)} cy={Y(v).toFixed(1)} r={i === n - 1 ? 4 : 2.5} fill={color} opacity={i === n - 1 ? 1 : .55} />
      ))}
      <text x={X(n - 1).toFixed(1)} y={(Y(values[n - 1]) - 9).toFixed(1)} textAnchor="end" fontSize="12" fontWeight="700" fill={color}>{values[n - 1]}</text>
      {labels.map((l, i) => (
        <text key={i} x={X(i).toFixed(1)} y={h - 8} textAnchor="middle" fontSize="9.5" fill="var(--text-muted)">{l}</text>
      ))}
    </svg>
  )
}
