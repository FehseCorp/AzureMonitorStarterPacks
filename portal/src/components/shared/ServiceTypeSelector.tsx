import {
  Dropdown,
  Option,
  makeStyles,
  tokens,
  Spinner,
  Text,
} from "@fluentui/react-components";

const ALL_VALUE = "__all__";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
});

interface ServiceTypeSelectorProps {
  serviceTypes: string[];
  selectedTypes: string[];
  onSelectionChange: (types: string[]) => void;
  isLoading?: boolean;
  error?: Error | null;
  label?: string;
}

export function ServiceTypeSelector({
  serviceTypes,
  selectedTypes,
  onSelectionChange,
  isLoading,
  error,
  label = "Select Service Type(s)",
}: ServiceTypeSelectorProps) {
  const styles = useStyles();

  const isAll = selectedTypes.length === 0;

  if (isLoading) {
    return <Spinner size="tiny" label="Loading service types..." />;
  }

  if (error) {
    return (
      <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
        Failed to load service types: {error.message}
      </Text>
    );
  }

  if (serviceTypes.length === 0) {
    return <Text size={200}>No service types available.</Text>;
  }

  const selectedOptions = isAll ? [ALL_VALUE] : selectedTypes;

  return (
    <div className={styles.container}>
      <Text size={200} weight="semibold">{label}</Text>
      <Dropdown
        multiselect
        placeholder="Choose service types..."
        selectedOptions={selectedOptions}
        onOptionSelect={(_, data) => {
          const opts = data.selectedOptions;
          if (opts.includes(ALL_VALUE)) {
            if (isAll) {
              // "All" was already active — user picked a specific type, so drop "All"
              onSelectionChange(opts.filter((o) => o !== ALL_VALUE));
            } else {
              // User clicked "All" — reset to show everything
              onSelectionChange([]);
            }
          } else {
            // No "All" in the new set — if empty, fall back to All
            onSelectionChange(opts.length > 0 ? opts : []);
          }
        }}
      >
        <Option key={ALL_VALUE} value={ALL_VALUE}>
          All
        </Option>
        {serviceTypes.map((ns) => (
          <Option key={ns} value={ns}>
            {ns}
          </Option>
        ))}
      </Dropdown>
    </div>
  );
}
