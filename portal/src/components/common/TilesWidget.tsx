import {
  Card,
  CardHeader,
  Text,
  Badge,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalM,
  },
  tile: {
    minWidth: "140px",
    padding: tokens.spacingHorizontalM,
    textAlign: "center",
  },
  count: {
    fontSize: "28px",
    fontWeight: "bold",
  },
});

interface TileData {
  label: string;
  value: number;
  color?: "brand" | "danger" | "success" | "warning" | "informative";
}

interface TilesWidgetProps {
  tiles: TileData[];
}

export function TilesWidget({ tiles }: TilesWidgetProps) {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      {tiles.map((tile) => (
        <Card key={tile.label} className={styles.tile}>
          <CardHeader
            header={
              <Text weight="semibold" size={300}>
                {tile.label}
              </Text>
            }
          />
          <div className={styles.count}>
            <Badge
              appearance="filled"
              color={tile.color ?? "brand"}
              size="extra-large"
            >
              {tile.value}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
