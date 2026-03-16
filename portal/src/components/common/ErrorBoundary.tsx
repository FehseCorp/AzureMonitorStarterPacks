import { Component, type ReactNode } from "react";
import { Text, Button, tokens } from "@fluentui/react-components";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <Text weight="semibold" style={{ color: tokens.colorPaletteRedForeground1 }}>
            {this.props.fallbackMessage ?? "Something went wrong rendering this section."}
          </Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, fontFamily: "monospace" }}>
            {this.state.error?.message}
          </Text>
          <Button
            appearance="subtle"
            size="small"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
