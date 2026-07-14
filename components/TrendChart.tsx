'use client'
// Grafico de linha leve (SVG puro, sem dependencias).
// O SVG usa preserveAspectRatio="none" para esticar a curva e preencher
// o espaco disponivel — isso e intencional para a linha/area do grafico.
// Mas texto (datas, valor atual) NAO pode ficar dentro desse SVG esticado:
// a distorcao nao-uniforme faz as letras esticarem horizontalmente e
// ficarem enormes em telas largas. Por isso o texto e renderizado como
// HTML posicionado por cima (em %), fora do SVG.
export default function TrendChart({
  values, labels, color = '#0d9488', height = 170,
}: { values: number[]; labels: string[]; color?: string; height?: number }) {
  if (!values || values.length < 2) return null
  const w = 560, h = height, pL = 10, pR = 12, pT = 16, pB = 26
  const n = values.length
  const max = Math.max(...values) * 1.15 || 1
  const X = (i: number) => pL + (i / (n - 1)) * (w - pL - pR)
  const Y = (v: number) => pT + (1 - v / max) * (h - pT - pB)
  const Xpct = (i: number) => (X(i) / w) * 100
  const Ypct = (v: number) => (Y(v) / h) * 100
  const line = values.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')
  const area = 'M' + X(0).toFixed(1) + ',' + (h - pB) + ' ' +
    values.map((v, i) => 'L' + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ') +
    ' L' + X(n - 1).toFixed(1) + ',' + (h - pB) + ' Z'
  const gid = 'tg' + color.replace(/[^a-z0-9]/gi, '')
  const grid = [0, .25, .5, .75, 1]
  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <svg className="trend-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Grafico de tendencia" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
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
      </svg>
      {/* Texto sobreposto em HTML normal — nao distorce, tamanho sempre correto */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <span style={{
          position: 'absolute',
          left: `${Xpct(n - 1)}%`, top: `${Ypct(values[n - 1])}%`,
          transform: 'translate(-100%, -22px)',
          fontSize: '12px', fontWeight: 700, color, whiteSpace: 'nowrap',
        }}>{values[n - 1]}</span>
        {labels.map((l, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: `${Xpct(i)}%`, bottom: 2,
            transform: 'translateX(-50%)',
            fontSize: '9.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap',
          }}>{l}</span>
        ))}
      </div>
    </div>
  )
}
