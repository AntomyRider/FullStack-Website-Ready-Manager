import { useMemo } from "react";

const SparklineCard = ({ label, value, tone = "zinc", dataPoints = [] }) => {
  const tones = {
    emerald: {
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      line: "#34d399",
    },
    amber: {
      text: "text-amber-300",
      border: "border-amber-500/20",
      line: "#fbbf24",
    },
    red: {
      text: "text-red-400",
      border: "border-red-500/20",
      line: "#f87171",
    },
    zinc: {
      text: "text-zinc-400",
      border: "border-zinc-800/70",
      line: "#a1a1aa",
    },
    sky: {
      text: "text-sky-400",
      border: "border-sky-500/20",
      line: "#38bdf8",
    },
  };

  const currentTone = tones[tone] || tones.zinc;

  const svgPaths = useMemo(() => {
    if (dataPoints.length === 0) return { line: "", fill: "" };

    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = max - min || 1;

    const points = dataPoints.map((val, i) => {
      const x = (i / (dataPoints.length - 1 || 1)) * 100;
      // Y-axis goes from 2 to 28 (total height 30)
      const y = 28 - ((val - min) / range) * 24;
      return { x, y };
    });

    // Create a smooth cubic bezier curve
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const fillPath = `${linePath} L 100 30 L 0 30 Z`;

    return { line: linePath, fill: fillPath };
  }, [dataPoints]);

  return (
    <div className={`bg-zinc-950 border ${currentTone.border} rounded-xl p-4 min-h-[130px] relative overflow-hidden flex flex-col justify-between`}>
      <div className="z-10">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-medium">{label}</p>
      </div>

      <div className="flex-grow flex items-center justify-center z-10 pb-2">
        <span className={`text-4xl font-bold tabular-nums ${currentTone.text}`}>
          {value}
        </span>
      </div>

      {/* Sparkline SVG Chart */}
      <div className="absolute inset-x-0 bottom-0 h-14 pointer-events-none">
        {dataPoints.length > 0 && (
          <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
            <defs>
              {/* Unique ID based on label to prevent gradient namespace collisions */}
              <linearGradient id={`spark-grad-${label.replace(/\s+/g, '-').toLowerCase()}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={currentTone.line} stopOpacity="0.25" />
                <stop offset="100%" stopColor={currentTone.line} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area Fill */}
            <path d={svgPaths.fill} fill={`url(#spark-grad-${label.replace(/\s+/g, '-').toLowerCase()})`} />
            {/* Line Path */}
            <path d={svgPaths.line} fill="none" stroke={currentTone.line} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
};

export default SparklineCard;
