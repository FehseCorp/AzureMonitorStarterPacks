import {
  Combobox,
  Option,
  makeStyles,
  tokens,
  Spinner,
  Text,
} from "@fluentui/react-components";
import { useQuery } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import { managementScope } from "../../auth/msalConfig";
import { callFunction } from "../../services/functionClient";
import { useConfig } from "../../hooks/useConfig";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
});

interface PackSelectorProps {
  selectedPacks: string[];
  onSelectionChange: (packs: string[]) => void;
  label?: string;
}

export function PackSelector({
  selectedPacks,
  onSelectionChange,
  label = "Select Pack(s)",
}: PackSelectorProps) {
  const styles = useStyles();
  const { config } = useConfig();
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const packsQuery = useQuery<string[]>({
    queryKey: ["availablePackTags", config.functionAppUrl],
    queryFn: async () => {
      if (!account || !config.functionAppUrl) return [];
      const tokenResponse = await instance.acquireTokenSilent({
        ...managementScope,
        account,
      });

      const result = await callFunction(
        config.functionAppUrl,
        tokenResponse.accessToken,
        "config",
        undefined,
        { Action: "getavailableIaaSPacks" },
      );
      console.log("[PackSelector] raw response:", result);
      // API may return a JSON array directly, or a JSON string that needs parsing
      let parsed = result;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { /* not JSON */ }
      }
      if (Array.isArray(parsed)) return parsed.map(String);
      console.warn("[PackSelector] unexpected response shape:", parsed);
      return [];
    },
    enabled: !!account && !!config.functionAppUrl,
    staleTime: 300_000, // 5 min cache
  });

  const packTags = packsQuery.data ?? [];

  if (!config.functionAppUrl) {
    return <Text size={200}>Configure a Function App first.</Text>;
  }

  if (packsQuery.isLoading) {
    return <Spinner size="tiny" label="Loading packs..." />;
  }

  if (packsQuery.isError) {
    return (
      <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
        Failed to load packs: {packsQuery.error instanceof Error ? packsQuery.error.message : String(packsQuery.error)}
      </Text>
    );
  }

  if (packsQuery.isSuccess && packTags.length === 0) {
    return <Text size={200}>No packs returned. Check Function App connectivity.</Text>;
  }

  return (
    <div className={styles.container}>
      <Text size={200} weight="semibold">{label}</Text>
      <Combobox
        multiselect
        placeholder="Choose packs..."
        selectedOptions={selectedPacks}
        onOptionSelect={(_, data) => {
          onSelectionChange(data.selectedOptions);
        }}
      >
        {packTags.map((tag) => (
          <Option key={tag} value={tag}>
            {tag}
          </Option>
        ))}
      </Combobox>
    </div>
  );
}
