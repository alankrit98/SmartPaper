import { useRef, useMemo, useCallback } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { aggregateBlooms, aggregateCOs, BLOOM_LEVELS } from '../utils/chartUtils'

// Register Chart.js components
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title)

// ── Colour palettes ──────────────────────────────────────────────
const BLOOM_COLORS = {
  K1: { bg: 'rgba(20, 184, 166, 0.85)',  border: '#0d9488' },  // teal
  K2: { bg: 'rgba(59, 130, 246, 0.85)',  border: '#2563eb' },  // blue
  K3: { bg: 'rgba(99, 102, 241, 0.85)',  border: '#4f46e5' },  // indigo
  K4: { bg: 'rgba(245, 158, 11, 0.85)',  border: '#d97706' },  // amber
  K5: { bg: 'rgba(249, 115, 22, 0.85)',  border: '#ea580c' },  // orange
  K6: { bg: 'rgba(239, 68, 68, 0.85)',   border: '#dc2626' },  // red
  Unknown: { bg: 'rgba(148, 163, 184, 0.6)', border: '#94a3b8' }, // slate
}

const BLOOM_LABELS = {
  K1: 'K1 – Remember',
  K2: 'K2 – Understand',
  K3: 'K3 – Apply',
  K4: 'K4 – Analyze',
  K5: 'K5 – Evaluate',
  K6: 'K6 – Create',
  Unknown: 'Unknown',
}

const CO_GRADIENT_COLORS = [
  { bg: 'rgba(99, 102, 241, 0.8)',  border: '#6366f1' },
  { bg: 'rgba(139, 92, 246, 0.8)',  border: '#8b5cf6' },
  { bg: 'rgba(168, 85, 247, 0.8)',  border: '#a855f7' },
  { bg: 'rgba(236, 72, 153, 0.8)',  border: '#ec4899' },
  { bg: 'rgba(244, 114, 182, 0.8)', border: '#f472b6' },
  { bg: 'rgba(251, 146, 60, 0.8)',  border: '#fb923c' },
  { bg: 'rgba(250, 204, 21, 0.8)',  border: '#facc15' },
  { bg: 'rgba(52, 211, 153, 0.8)',  border: '#34d399' },
]

export default function AnalysisCharts({ paper }) {
  const pieRef = useRef(null)
  const barRef = useRef(null)

  // ── Aggregation ────────────────────────────────────────────────
  const bloomsData = useMemo(() => aggregateBlooms(paper), [paper])
  const coData = useMemo(() => aggregateCOs(paper), [paper])

  const totalBloomMarks = useMemo(
    () => Object.values(bloomsData).reduce((s, v) => s + v, 0),
    [bloomsData]
  )
  const totalCOMarks = useMemo(
    () => Object.values(coData).reduce((s, v) => s + v, 0),
    [coData]
  )

  // ── Filter out zero-value bloom levels for the pie chart ───────
  const activeBloomKeys = useMemo(
    () => Object.keys(bloomsData).filter((k) => bloomsData[k] > 0),
    [bloomsData]
  )

  // ── Pie chart data ─────────────────────────────────────────────
  const pieData = useMemo(() => ({
    labels: activeBloomKeys.map(
      (k) =>
        `${BLOOM_LABELS[k] || k}: ${bloomsData[k]}m (${totalBloomMarks ? Math.round((bloomsData[k] / totalBloomMarks) * 100) : 0}%)`
    ),
    datasets: [
      {
        data: activeBloomKeys.map((k) => bloomsData[k]),
        backgroundColor: activeBloomKeys.map((k) => (BLOOM_COLORS[k] || BLOOM_COLORS.Unknown).bg),
        borderColor: activeBloomKeys.map((k) => (BLOOM_COLORS[k] || BLOOM_COLORS.Unknown).border),
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }), [activeBloomKeys, bloomsData, totalBloomMarks])

  const pieOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 14,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#475569',
        },
      },
      title: {
        display: true,
        text: "Bloom's Taxonomy Distribution",
        font: { family: "'Inter', sans-serif", size: 15, weight: 700 },
        color: '#0f172a',
        padding: { bottom: 16 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed
            const pct = totalBloomMarks ? Math.round((val / totalBloomMarks) * 100) : 0
            return ` ${val} marks (${pct}%)`
          },
        },
      },
    },
    cutout: '45%',
  }), [totalBloomMarks])

  // ── Bar chart data ─────────────────────────────────────────────
  const coKeys = useMemo(() => Object.keys(coData), [coData])

  const barData = useMemo(() => ({
    labels: coKeys,
    datasets: [
      {
        label: 'Total Marks',
        data: coKeys.map((k) => coData[k]),
        backgroundColor: coKeys.map((_, i) => CO_GRADIENT_COLORS[i % CO_GRADIENT_COLORS.length].bg),
        borderColor: coKeys.map((_, i) => CO_GRADIENT_COLORS[i % CO_GRADIENT_COLORS.length].border),
        borderWidth: 2,
        borderRadius: 8,
        maxBarThickness: 64,
      },
    ],
  }), [coKeys, coData])

  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Course Outcome Distribution',
        font: { family: "'Inter', sans-serif", size: 15, weight: 700 },
        color: '#0f172a',
        padding: { bottom: 16 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y
            const pct = totalCOMarks ? Math.round((val / totalCOMarks) * 100) : 0
            return ` ${val} marks (${pct}%)`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
          color: '#475569',
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#94a3b8',
          stepSize: 5,
        },
        title: {
          display: true,
          text: 'Marks',
          font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
          color: '#475569',
        },
      },
    },
    animation: {
      onComplete: function () {
        const chart = this
        const ctx = chart.ctx
        ctx.font = "bold 11px 'Inter', sans-serif"
        ctx.textAlign = 'center'
        ctx.fillStyle = '#0f172a'
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i)
          meta.data.forEach((bar, index) => {
            const value = dataset.data[index]
            ctx.fillText(value, bar.x, bar.y - 8)
          })
        })
      },
    },
  }), [totalCOMarks])

  // ── Download chart as PNG ──────────────────────────────────────
  const downloadChart = useCallback((chartRef, filename) => {
    const chart = chartRef.current
    if (!chart) return
    const url = chart.canvas.toDataURL('image/png', 1.0)
    const link = document.createElement('a')
    link.download = filename
    link.href = url
    document.body.appendChild(link)
    link.click()
    link.remove()
  }, [])

  // Guard: no data at all
  if (totalBloomMarks === 0 && totalCOMarks === 0) {
    return (
      <div className="analysis-section glass-card animate-slide-up" style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No Bloom's level or CO data available for this paper.
        </p>
      </div>
    )
  }

  return (
    <div className="analysis-section animate-slide-up">
      {/* Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
          <span className="gradient-text">📊 Question Paper Analysis</span>
        </h2>
      </div>

      {/* Summary Badges */}
      <div className="analysis-badges" style={{ marginBottom: '20px' }}>
        {BLOOM_LEVELS.map((k) => (
          <span
            key={k}
            className="analysis-badge"
            style={{
              borderLeft: `3px solid ${BLOOM_COLORS[k].border}`,
              opacity: bloomsData[k] > 0 ? 1 : 0.4,
            }}
          >
            <strong>{k}</strong> {bloomsData[k] || 0}m
          </span>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Pie Chart — Bloom's */}
        <div className="chart-card glass-card">
          <div style={{ position: 'relative', height: '340px' }}>
            <Doughnut ref={pieRef} data={pieData} options={pieOptions} />
          </div>
          <button
            className="chart-export-btn"
            onClick={() => downloadChart(pieRef, 'blooms_distribution.png')}
            title="Download as PNG"
          >
            📥 Export PNG
          </button>
        </div>

        {/* Bar Chart — COs */}
        <div className="chart-card glass-card">
          <div style={{ position: 'relative', height: '340px' }}>
            <Bar ref={barRef} data={barData} options={barOptions} />
          </div>
          <button
            className="chart-export-btn"
            onClick={() => downloadChart(barRef, 'co_distribution.png')}
            title="Download as PNG"
          >
            📥 Export PNG
          </button>
        </div>
      </div>


    </div>
  )
}
