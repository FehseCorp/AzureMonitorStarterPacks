import { Text, makeStyles, tokens } from "@fluentui/react-components";

const useStyles = makeStyles({
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: tokens.spacingVerticalS,
  },
  label: {
    fontWeight: "bold",
  },
});

interface ScoreGaugeProps {
  score: number; // 0–100
}

function scoreColor(score: number): string {
  if (score >= 80) return "#107c10"; // green
  if (score >= 60) return "#ff8c00"; // orange/amber
  return "#d13438"; // red
}

function scoreBand(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Needs Attention";
  return "Critical";
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const styles = useStyles();
  const clampedScore = Math.max(0, Math.min(100, score));

  // SVG arc gauge: half-circle, radius 60, centre 70,70
  const r = 60;
  const cx = 70;
  const cy = 70;
  const startAngle = -180; // left
  const totalArc = 180;    // half circle
  const fillAngle = (clampedScore / 100) * totalArc;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (angle: number) => {
    const end = startAngle + angle;
    const x = cx + r * Math.cos(toRad(end));
    const y = cy + r * Math.sin(toRad(end));
    const large = angle > 180 ? 1 : 0;
    const sx = cx + r * Math.cos(toRad(startAngle));
    const sy = cy + r * Math.sin(toRad(startAngle));
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${x} ${y}`;
  };

  const color = scoreColor(clampedScore);
  const band = scoreBand(clampedScore);

  return (
    <div className={styles.wrapper}>
      <svg width="140" height="90" viewBox="0 0 140 90">
        {/* background track */}
        <path
          d={arcPath(180)}
          fill="none"
          stroke={tokens.colorNeutralStroke2}
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* filled arc */}
        {clampedScore > 0 && (
          <path
            d={arcPath(fillAngle)}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        {/* score text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="22"
          fontWeight="bold"
          fill={color}
        >
          {clampedScore}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontSize="9"
          fill={tokens.colorNeutralForeground3}
        >
          out of 100
        </text>
      </svg>
      <Text className={styles.label} style={{ color }}>
        {band}
      </Text>
    </div>
  );
}
