import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Spinner,
} from "@fluentui/react-components";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  confirmDisabled?: boolean;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isPending,
  confirmDisabled,
  danger,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onCancel(); }}>
      <DialogSurface>
        <DialogTitle>{title}</DialogTitle>
        <DialogBody>
          <DialogContent>{children}</DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel} disabled={isPending}>
              {cancelLabel}
            </Button>
            <Button
              appearance="primary"
              onClick={onConfirm}
              disabled={isPending || confirmDisabled}
              style={danger ? { backgroundColor: "#d13438" } : undefined}
            >
              {isPending ? <Spinner size="tiny" /> : confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
