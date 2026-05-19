import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Minus, KeyRound } from "lucide-react";
import { getHistory } from "../../api/history";

const RANGES = [
  { label: "1D", days: 1 },
  { label: "3D", days: 3 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
];

const UsageChart = () => {
  const [history, setHistory] = useState([]);
  const [activeRange, setActiveRange] = useState(7);
  const [hovered, setHovered] = useState(null);
  const [animKey, setAnimKey] = useState(0);
  const svgRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const h = await getHistory();
        const list = Array.isArray(h)
          ? h
          : Array.isArray(h?.data)
          ? h.data
          : Array.isArray(h?.history)
          ? h.history
          : Array.isArray(h?.items)
          ? h.items
          : [];
        setHistory(list);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const buildChartData = (days) => {
    const now = new Date();
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key =
        days === 1
          ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
          : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      buckets[key] = 0;
    }
    history.forEach((h) => {
      const date = new Date(h.activatedAt);
      const diff = (now - date) / (1000 * 60 * 60 * 24);
      if (diff <= days) {
        const key =
          days === 1
            ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        if (key in buckets) buckets[key] = (buckets[key] || 0) + 1;
      }
    });
    return Object.entries(buckets).map(([label, count]) => ({ label, count }));
  };

  const handleRangeChange = (days) => {
    setActiveRange(days);
    setAnimKey((k) => k + 1);
    setHovered(null);
  };

  const data = buildChartData(activeRange);
  const total = data.reduce((s, d) => s + d.count, 0);
  const rawMax = Math.max(...data.map((d) => d.count));
  const isEmpty = rawMax === 0;
  const max = isEmpty ? 4 : rawMax;

  const prevHalf = data.slice(0, Math.floor(data.length / 2));
  const currHalf = data.slice(Math.floor(data.length / 2));
  const trend =
    currHalf.reduce((s, d) => s + d.count, 0) -
    prevHalf.reduce((s, d) => s + d.count, 0);

  const W = 600;
  const H = 260;
  const PX = 8;
  const PY = 16;

  const points = data.map((item, i) => {
    const x = PX + (i / Math.max(data.length - 1, 1)) * (W - PX * 2);
    const y = isEmpty
      ? H - PY - 0.18 * (H - PY * 2)
      : H - PY - (item.count / max) * (H - PY * 2);
    return { ...item, x, y };
  });

  const smoothPath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const fillPath = points.length
    ? `${smoothPath} L ${points[points.length - 1].x} ${H - PY} L ${points[0].x} ${H - PY} Z`
    : "";

  const showDots = data.length <= 14;
  const labelStep = Math.ceil(data.length / 6);
  const visibleLabels = data.filter((_, i) => i % labelStep === 0 || i === data.length - 1);
  const gridYs = [0, 0.33, 0.66, 1].map((t) => PY + t * (H - PY * 2));

  return (
    <div
      style={{ fontFamily: "'DM Mono', 'Fira Code', monospace" }}
      className="bg-[#090b10] border border-white/[0.06] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <KeyRound size={15} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mb-0.5">
              Key Activation
            </p>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold text-white tabular-nums leading-none">
                {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1.5">
                {trend > 0 ? (
                  <TrendingUp size={11} className="text-emerald-400" />
                ) : trend < 0 ? (
                  <TrendingDown size={11} className="text-rose-400" />
                ) : (
                  <Minus size={11} className="text-zinc-600" />
                )}
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    trend > 0 ? "text-emerald-400" : trend < 0 ? "text-rose-400" : "text-zinc-600"
                  }`}
                >
                  {trend > 0 ? "+" : ""}{trend}
                </span>
                <span className="text-[11px] text-zinc-600">vs prev</span>
              </div>
            </div>
          </div>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-0.5 p-1 bg-white/[0.03] border border-white/[0.05] rounded-xl">
          {RANGES.map(({ label, days }) => (
            <button
              key={days}
              onClick={() => handleRangeChange(days)}
              className={`
                relative px-3.5 py-1.5 rounded-lg text-[11px] font-medium tracking-wide
                transition-all duration-200 select-none
                ${activeRange === days ? "text-emerald-300" : "text-zinc-600 hover:text-zinc-400"}
              `}
            >
              {activeRange === days && (
                <span
                  className="absolute inset-0 rounded-lg bg-emerald-500/10 border border-emerald-500/25"
                  style={{ boxShadow: "0 0 14px rgba(52,211,153,0.1)" }}
                />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.04] mx-5" />

      {/* Chart */}
      <div className="px-4 pt-4 pb-1 relative">
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none pb-4">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-zinc-800/60 flex items-center justify-center mx-auto mb-2">
                <KeyRound size={13} className="text-zinc-600" />
              </div>
              <p className="text-[11px] text-zinc-600 tracking-widest uppercase">No data</p>
              <p className="text-[10px] text-zinc-700 mt-0.5">
                {activeRange === 1 ? "Last 24 hours" : `Last ${activeRange} days`}
              </p>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          key={animKey}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: "240px" }}
          preserveAspectRatio="none"
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="ug-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={isEmpty ? "0.03" : "0.14"} />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ug-line" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="60%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
            <filter id="ug-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="ug-clip">
              <rect x={PX} y={0} width={W - PX * 2} height={H} />
            </clipPath>
          </defs>

          {/* Grid */}
          {gridYs.map((y, i) => (
            <line
              key={i}
              x1={PX} x2={W - PX} y1={y} y2={y}
              stroke="rgba(255,255,255,0.035)"
              strokeWidth="1"
              strokeDasharray={i === 0 ? "0" : "4 6"}
            />
          ))}

          {/* Fill */}
          <path d={fillPath} fill="url(#ug-fill)" clipPath="url(#ug-clip)" />

          {/* Glow line */}
          {!isEmpty && (
            <path
              d={smoothPath}
              fill="none"
              stroke="#34d399"
              strokeWidth="10"
              opacity="0.08"
              filter="url(#ug-glow)"
              clipPath="url(#ug-clip)"
            />
          )}

          {/* Main line */}
          <path
            d={smoothPath}
            fill="none"
            stroke={isEmpty ? "rgba(52,211,153,0.1)" : "url(#ug-line)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath="url(#ug-clip)"
          />

          {/* Dots + hover zones */}
          {points.map((point, i) => (
            <g key={point.label}>
              <rect
                x={i === 0 ? PX : (points[i - 1].x + point.x) / 2}
                y={0}
                width={
                  i === 0
                    ? Math.max((points[1]?.x ?? point.x + 10) / 2 - PX, 1)
                    : i === points.length - 1
                    ? W - PX - (points[i - 1].x + point.x) / 2
                    : ((points[i + 1]?.x ?? point.x) - (points[i - 1]?.x ?? point.x)) / 2
                }
                height={H}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                style={{ cursor: "crosshair" }}
              />

              {hovered === i && (
                <line
                  x1={point.x} x2={point.x}
                  y1={PY} y2={H - PY}
                  stroke="#34d399"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.25"
                />
              )}

              {showDots && !isEmpty && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hovered === i ? 4.5 : 2.5}
                  fill={hovered === i ? "#34d399" : "#0d2419"}
                  stroke="#34d399"
                  strokeWidth={hovered === i ? 1.5 : 1}
                  style={{ transition: "r 0.12s" }}
                  filter={hovered === i ? "url(#ug-glow)" : "none"}
                />
              )}

              {!showDots && hovered === i && !isEmpty && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={4.5}
                  fill="#34d399"
                  stroke="#0d2419"
                  strokeWidth="1.5"
                  filter="url(#ug-glow)"
                />
              )}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hovered !== null && points[hovered] && !isEmpty && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: `${(points[hovered].x / W) * 100}%`,
              top: `${(points[hovered].y / 240) * 100}%`,
              transform: "translate(-50%, calc(-100% - 10px))",
            }}
          >
            <div
              className="bg-[#0c1a12] border border-emerald-500/25 rounded-lg px-3 py-2 text-center whitespace-nowrap"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.08)" }}
            >
              <div className="text-emerald-300 font-bold text-sm tabular-nums">
                {points[hovered].count}
              </div>
              <div className="text-zinc-500 text-[10px] mt-0.5">{points[hovered].label}</div>
            </div>
            <div
              className="w-2 h-2 bg-[#0c1a12] border-r border-b border-emerald-500/25 rotate-45 mx-auto"
              style={{ marginTop: "-5px" }}
            />
          </div>
        )}
      </div>

      {/* X-axis */}
      <div className="flex justify-between px-5 pb-4 mt-1">
        {visibleLabels.map((d) => (
          <span key={d.label} className="text-[10px] text-zinc-700 tabular-nums">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default UsageChart;