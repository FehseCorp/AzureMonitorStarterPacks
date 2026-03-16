import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardHeader, Text, Spinner, makeStyles, tokens } from "@fluentui/react-components";

const COLORS = [
  tokens.colorPaletteBlueBorderActive,
  tokens.colorPaletteGreenBorderActive,
  tokens.colorPaletteRedBorderActive,
  tokens.colorPaletteYellowBorderActive,
  tokens.colorPalettePurpleBorderActive,
  tokens.colorPaletteTealBorderActive,
  tokens.colorPaletteMarigoldBorderActive,
  tokens.colorPalettePinkBorderActive,
];

// Fallback hex colors for Recharts (which needs actual color values, not CSS vars)
const COLORS_HEX = [
  "#0078d4", "#107c10", "#d13438", "#ffc83d",
  "#8764b8", "#038387", "#eaa300", "#e3008c",
];

const useStyles = makeStyles({
  card: {
    minWidth: "300px",
    minHeight: "300px",
    padding: tokens.spacingHorizontalM,
  },
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "200px",
  },
});

interface PieChartWidgetProps {
  title: string;
  data: { name: string; value: number }[];
  isLoading?: boolean;
  error?: Error | string | null;
}

export function PieChartWidget({ title, data, isLoading, error }: PieChartWidgetProps) {
  const styles = useStyles();

  return (
    <Card className={styles.card}>
      <CardHeader header={<Text weight="semibold" size={400}>{title}</Text>} />
      {isLoading ? (
        <div className={styles.empty}>
          <Spinner size="medium" label="Loading..." />
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <Text style={{ color: "red" }}>{error instanceof Error ? error.message : String(error)}</Text>
        </div>
      ) : data.length === 0 ? (
        <div className={styles.empty}>
          <Text>No data</Text>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              nameKey="name"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS_HEX[index % COLORS_HEX.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
