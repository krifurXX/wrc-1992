import {
  AXIS,
  FN_LINES,
  MODE_BOUNDARIES,
  MODES,
  type ModeId,
} from '../data/wrc1992'

export interface DiagramMarker {
  x: number
  y: number
  /** Rendered next to the marker; empty string = no label */
  label: string
  shape: 'circle' | 'square' | 'diamond' | 'ring' | 'dot'
  color: string
  size?: 'normal' | 'small'
}

export interface DiagramLine {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  dash?: string
  opacity?: number
}

interface Props {
  markers: DiagramMarker[]
  lines: DiagramLine[]
  activeModeId: ModeId | null
}

// px per equivalent unit; the WRC axes span only 14 x 9 units so the scale is
// larger than in the Schaeffler sister app
const S = 56
const M = { left: 74, right: 30, top: 26, bottom: 64 }
const W = M.left + (AXIS.crMax - AXIS.crMin) * S + M.right
const H = M.top + (AXIS.niMax - AXIS.niMin) * S + M.bottom

const px = (x: number) => M.left + (x - AXIS.crMin) * S
const py = (y: number) => M.top + (AXIS.niMax - y) * S

const MODE_FILL: Record<ModeId, string> = {
  A: '#d2e6f4',
  AF: '#dce8e0',
  FA: '#d8ecd8',
  F: '#f2ecca',
}

/** Liang–Barsky clip of a segment (in diagram units) to the axis rectangle. */
function clipToAxis(l: DiagramLine): DiagramLine | null {
  const dx = l.x2 - l.x1
  const dy = l.y2 - l.y1
  let t0 = 0
  let t1 = 1
  const p = [-dx, dx, -dy, dy]
  const q = [l.x1 - AXIS.crMin, AXIS.crMax - l.x1, l.y1 - AXIS.niMin, AXIS.niMax - l.y1]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null
    } else {
      const r = q[i] / p[i]
      if (p[i] < 0) {
        if (r > t1) return null
        if (r > t0) t0 = r
      } else {
        if (r < t0) return null
        if (r < t1) t1 = r
      }
    }
  }
  return { ...l, x1: l.x1 + t0 * dx, y1: l.y1 + t0 * dy, x2: l.x1 + t1 * dx, y2: l.y1 + t1 * dy }
}

const inAxis = (x: number, y: number) =>
  x >= AXIS.crMin && x <= AXIS.crMax && y >= AXIS.niMin && y <= AXIS.niMax

/** Label anchor fraction along each FN line, staggered like the original figure. */
function labelT(i: number): number {
  return [0.72, 0.55, 0.4][i % 3]
}

export default function WrcDiagram({ markers, lines, activeModeId }: Props) {
  const gridX = []
  for (let x = AXIS.crMin; x <= AXIS.crMax; x += 1) gridX.push(x)
  const gridY = []
  for (let y = AXIS.niMin; y <= AXIS.niMax; y += 1) gridY.push(y)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto bg-white border border-gray-300"
      role="img"
      aria-label="WRC-1992 diagram"
    >
      {/* solidification-mode regions */}
      {MODES.map((m) => (
        <polygon
          key={m.id}
          points={m.polygon.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}
          fill={MODE_FILL[m.id]}
          fillOpacity={activeModeId === m.id ? 1 : 0.45}
        />
      ))}

      {/* grid */}
      {gridX.map((x) => (
        <line key={`gx${x}`} x1={px(x)} y1={py(AXIS.niMin)} x2={px(x)} y2={py(AXIS.niMax)} stroke="#000" strokeOpacity={0.08} />
      ))}
      {gridY.map((y) => (
        <line key={`gy${y}`} x1={px(AXIS.crMin)} y1={py(y)} x2={px(AXIS.crMax)} y2={py(y)} stroke="#000" strokeOpacity={0.08} />
      ))}

      {/* iso-FN lines (index 0 = the curved FN 0 line, drawn as dash-dot below) */}
      {FN_LINES.slice(1).map((l) => (
        <polyline
          key={`fn${l.fn}`}
          points={l.points.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}
          fill="none"
          stroke="#46555f"
          strokeWidth={1.4}
        />
      ))}

      {/* solidification-mode boundaries incl. the FN 0 line (dash-dot) */}
      {MODE_BOUNDARIES.map((b, i) => (
        <polyline
          key={`mb${i}`}
          points={b.points.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}
          fill="none"
          stroke="#46555f"
          strokeWidth={1.2}
          strokeDasharray="9 4 2 4"
        />
      ))}

      {/* FN labels on the lines, rotated and staggered like the original */}
      {FN_LINES.map((l, i) => {
        const pts = l.points
        const t = l.fn === 0 ? 0.62 : labelT(i)
        const seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)))
        const f = t * (pts.length - 1) - seg
        const x = pts[seg][0] + f * (pts[seg + 1][0] - pts[seg][0])
        const y = pts[seg][1] + f * (pts[seg + 1][1] - pts[seg][1])
        const ang =
          (Math.atan2(
            py(pts[seg + 1][1]) - py(pts[seg][1]),
            px(pts[seg + 1][0]) - px(pts[seg][0]),
          ) *
            180) /
          Math.PI
        return (
          <text
            key={`fl${l.fn}`}
            x={px(x)}
            y={py(y) + 4}
            fontSize={13}
            fontWeight={700}
            fill="#1f2d36"
            stroke="#fff"
            strokeWidth={4}
            paintOrder="stroke"
            textAnchor="middle"
            transform={`rotate(${ang} ${px(x)} ${py(y) + 4})`}
          >
            {l.fn}
          </text>
        )
      })}

      {/* mode labels */}
      {MODES.map((m) => (
        <text
          key={`lbl${m.id}`}
          x={px(m.labelAt[0])}
          y={py(m.labelAt[1])}
          fontSize={m.short.length > 1 ? 15 : 18}
          fontWeight={700}
          fill="#1f2d36"
          textAnchor="middle"
        >
          {m.short}
        </text>
      ))}

      {/* axes */}
      <rect
        x={px(AXIS.crMin)}
        y={py(AXIS.niMax)}
        width={(AXIS.crMax - AXIS.crMin) * S}
        height={(AXIS.niMax - AXIS.niMin) * S}
        fill="none"
        stroke="#1f2d36"
        strokeWidth={1.5}
      />
      {gridX.filter((x) => x % 2 === 0).map((x) => (
        <text key={`tx${x}`} x={px(x)} y={py(AXIS.niMin) + 18} fontSize={12} textAnchor="middle" fill="#202020">
          {x}
        </text>
      ))}
      {gridY.filter((y) => y % 2 === 0).map((y) => (
        <text key={`ty${y}`} x={px(AXIS.crMin) - 8} y={py(y) + 4} fontSize={12} textAnchor="end" fill="#202020">
          {y}
        </text>
      ))}
      <text x={px(AXIS.crMin + (AXIS.crMax - AXIS.crMin) / 2)} y={H - 16} fontSize={13} textAnchor="middle" fill="#202020">
        Chromium equivalent  Cr
        <tspan baselineShift="sub" fontSize={10}>eq</tspan> = %Cr + %Mo + 0.7·%Nb
      </text>
      <text
        x={22}
        y={py(AXIS.niMin + (AXIS.niMax - AXIS.niMin) / 2)}
        fontSize={13}
        textAnchor="middle"
        fill="#202020"
        transform={`rotate(-90 22 ${py(AXIS.niMin + (AXIS.niMax - AXIS.niMin) / 2)})`}
      >
        Nickel equivalent  Ni
        <tspan baselineShift="sub" fontSize={10}>eq</tspan> = %Ni + 35·%C + 20·%N + 0.25·%Cu
      </text>

      {/* scene lines, clipped to the axis rectangle */}
      {lines.map((l, i) => {
        const c = clipToAxis(l)
        if (!c) return null
        return (
          <line
            key={`sl${i}`}
            x1={px(c.x1)}
            y1={py(c.y1)}
            x2={px(c.x2)}
            y2={py(c.y2)}
            stroke={l.color}
            strokeWidth={1.5}
            strokeDasharray={l.dash}
            strokeOpacity={l.opacity ?? 1}
          />
        )
      })}

      {/* scene markers; out-of-range markers become hollow edge indicators */}
      {markers.map((m, i) => {
        const outside = !inAxis(m.x, m.y)
        const cxu = Math.min(AXIS.crMax - 0.3, Math.max(AXIS.crMin + 0.3, m.x))
        const cyu = Math.min(AXIS.niMax - 0.3, Math.max(AXIS.niMin + 0.3, m.y))
        const cx = px(outside ? cxu : m.x)
        const cy = py(outside ? cyu : m.y)
        const small = m.size === 'small'
        const fill = outside ? 'none' : m.color
        const strokeProps = outside ? { stroke: m.color, strokeWidth: 2 } : {}
        return (
          <g key={`sm${i}`}>
            {m.shape === 'circle' && <circle cx={cx} cy={cy} r={small ? 3 : 6} fill={fill} {...strokeProps} />}
            {m.shape === 'square' && (
              <rect x={cx - (small ? 3 : 5.5)} y={cy - (small ? 3 : 5.5)} width={small ? 6 : 11} height={small ? 6 : 11} fill={fill} {...strokeProps} />
            )}
            {m.shape === 'diamond' && (
              <rect
                x={cx - (small ? 3 : 5.5)}
                y={cy - (small ? 3 : 5.5)}
                width={small ? 6 : 11}
                height={small ? 6 : 11}
                fill={fill}
                {...strokeProps}
                transform={`rotate(45 ${cx} ${cy})`}
              />
            )}
            {m.shape === 'ring' && (
              <>
                <circle cx={cx} cy={cy} r={8} fill="none" stroke={m.color} strokeWidth={3} />
                {!outside && <circle cx={cx} cy={cy} r={2.5} fill={m.color} />}
              </>
            )}
            {m.shape === 'dot' && <circle cx={cx} cy={cy} r={small ? 3 : 4} fill={fill} {...strokeProps} />}
            {outside &&
              (() => {
                const ang = Math.atan2(py(m.y) - cy, px(m.x) - cx)
                const ax = cx + 14 * Math.cos(ang)
                const ay = cy + 14 * Math.sin(ang)
                return (
                  <>
                    <line x1={cx} y1={cy} x2={ax} y2={ay} stroke={m.color} strokeWidth={2} />
                    <polygon
                      points={`${ax},${ay} ${ax - 7 * Math.cos(ang - 0.45)},${ay - 7 * Math.sin(ang - 0.45)} ${ax - 7 * Math.cos(ang + 0.45)},${ay - 7 * Math.sin(ang + 0.45)}`}
                      fill={m.color}
                    />
                  </>
                )
              })()}
            {m.label && (
              <text
                x={cx + (small ? 6 : 10)}
                y={cy - (small ? 5 : 9)}
                fontSize={small ? 10 : 13}
                fontWeight={700}
                fill={m.color}
                stroke="#fff"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {outside ? `${m.label} (${m.x.toFixed(1)}, ${m.y.toFixed(1)})` : m.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
