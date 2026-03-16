import { useState } from "react";
import {
  Button,
  Spinner,
  Text,
  Textarea,
  Title3,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useBackendAction } from "../../hooks/useBackendAction";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    maxWidth: "800px",
  },
});

export function ImportPack() {
  const styles = useStyles();
  const [packJson, setPackJson] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const action = useBackendAction({
    onSuccess: () => {
      setShowConfirm(false);
      setPackJson("");
      setSuccessMsg("Pack imported successfully.");
    },
    onError: (err) => {
      setShowConfirm(false);
      setParseError(`Import failed: ${err.message}`);
    },
  });

  const handleImportClick = () => {
    setParseError(null);
    setSuccessMsg(null);
    try {
      JSON.parse(packJson);
    } catch {
      setParseError("Invalid JSON. Please check the pack definition syntax.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    const parsed = JSON.parse(packJson);
    action.mutate({
      endpoint: "packmgmt",
      body: {
        Action: "importPack",
        PackDef: Array.isArray(parsed) ? parsed : [parsed],
      },
    });
  };

  return (
    <div className={styles.container}>
      <Title3>Import Pack Definition</Title3>
      <Text size={200}>
        Paste a pack JSON definition below. This can be a single pack object or an array of packs.
      </Text>
      <Textarea
        placeholder='[{"Name": "MyPack", "Tag": "MyPack", ...}]'
        resize="vertical"
        rows={12}
        value={packJson}
        onChange={(_, data) => {
          setPackJson(data.value);
          setParseError(null);
          setSuccessMsg(null);
        }}
        style={{ fontFamily: "monospace", fontSize: "13px" }}
      />
      {parseError && (
        <Text style={{ color: tokens.colorPaletteRedForeground1 }}>{parseError}</Text>
      )}
      {successMsg && (
        <Text style={{ color: tokens.colorPaletteGreenForeground1 }}>{successMsg}</Text>
      )}
      <div>
        <Button
          appearance="primary"
          disabled={!packJson.trim() || action.isPending}
          onClick={handleImportClick}
        >
          {action.isPending ? <Spinner size="tiny" /> : "Import Pack Definition"}
        </Button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Import Pack Definition"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        isPending={action.isPending}
      >
        Import the provided pack definition? Existing packs with the same tag will be skipped.
      </ConfirmDialog>
    </div>
  );
}
