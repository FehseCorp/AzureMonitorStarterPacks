import { useState, useMemo, useCallback } from "react";
import {
  Input,
  Button,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Checkbox,
  makeStyles,
  tokens,
  Text,
  mergeClasses,
} from "@fluentui/react-components";
import {
  FilterRegular,
  DismissRegular,
  AddRegular,
} from "@fluentui/react-icons";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Describes one filterable dimension (e.g. Type, Location). */
export interface FilterDimension {
  /** Unique key used in the filter state object. */
  key: string;
  /** Display label shown in the bubble. */
  label: string;
  /** All possible values for this dimension (derived from data). */
  values: string[];
  /** If true the bubble is shown by default even when no filter is active. */
  defaultVisible?: boolean;
}

/** The current filter state – maps dimension key → selected values (empty = all). */
export type FilterState = Record<string, string[]>;

export interface FilterBarProps {
  /** Available filter dimensions. */
  dimensions: FilterDimension[];
  /** Current filter state (controlled). */
  filterState: FilterState;
  /** Called when any filter changes. */
  onFilterChange: (state: FilterState) => void;
  /** Free-text search value (controlled). */
  searchText: string;
  /** Called when the free-text search changes. */
  onSearchTextChange: (text: string) => void;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const useStyles = makeStyles({
  bar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalS,
  },
  searchInput: {
    minWidth: "200px",
    maxWidth: "260px",
  },
  bubble: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    height: "32px",
    boxSizing: "border-box",
  },
  bubbleActive: {
    borderColor: tokens.colorBrandStroke1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  popoverBody: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
    maxHeight: "260px",
    overflowY: "auto",
    minWidth: "180px",
  },
  dimissIcon: {
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    "&:hover": { color: tokens.colorPaletteRedForeground1 },
  },
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function FilterBar({
  dimensions,
  filterState,
  onFilterChange,
  searchText,
  onSearchTextChange,
}: FilterBarProps) {
  const styles = useStyles();

  // Track which optional dimensions have been added by the user.
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  // Dimensions currently shown = default-visible ones + user-added ones.
  const visibleDims = useMemo(
    () => dimensions.filter((d) => d.defaultVisible || addedKeys.has(d.key)),
    [dimensions, addedKeys],
  );

  const hiddenDims = useMemo(
    () => dimensions.filter((d) => !d.defaultVisible && !addedKeys.has(d.key)),
    [dimensions, addedKeys],
  );

  const setDimFilter = useCallback(
    (key: string, selected: string[]) => {
      onFilterChange({ ...filterState, [key]: selected });
    },
    [filterState, onFilterChange],
  );

  const removeDimFilter = useCallback(
    (key: string) => {
      const next = { ...filterState };
      delete next[key];
      onFilterChange(next);
      setAddedKeys((prev) => {
        const s = new Set(prev);
        s.delete(key);
        return s;
      });
    },
    [filterState, onFilterChange],
  );

  return (
    <div className={styles.bar}>
      {/* Free-text search */}
      <Input
        className={styles.searchInput}
        contentBefore={<FilterRegular />}
        placeholder="Filter for any field"
        value={searchText}
        onChange={(_, d) => onSearchTextChange(d.value)}
        size="medium"
      />

      {/* Bubbles for each visible dimension */}
      {visibleDims.map((dim) => (
        <DimensionBubble
          key={dim.key}
          dimension={dim}
          selected={filterState[dim.key] ?? []}
          onChange={(sel) => setDimFilter(dim.key, sel)}
          onRemove={dim.defaultVisible ? undefined : () => removeDimFilter(dim.key)}
        />
      ))}

      {/* "+ Add filter" button */}
      {hiddenDims.length > 0 && (
        <AddFilterButton
          dimensions={hiddenDims}
          onAdd={(key) => setAddedKeys((prev) => new Set(prev).add(key))}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DimensionBubble                                                     */
/* ------------------------------------------------------------------ */

function DimensionBubble({
  dimension,
  selected,
  onChange,
  onRemove,
}: {
  dimension: FilterDimension;
  selected: string[];
  onChange: (sel: string[]) => void;
  onRemove?: () => void;
}) {
  const styles = useStyles();
  const isFiltered = selected.length > 0;
  const label =
    selected.length === 0
      ? `${dimension.label} equals all`
      : selected.length === 1
        ? `${dimension.label} equals ${selected[0]}`
        : `${dimension.label} equals ${selected.length} selected`;

  return (
    <Popover trapFocus withArrow>
      <PopoverTrigger disableButtonEnhancement>
        <span className={mergeClasses(styles.bubble, isFiltered && styles.bubbleActive)}>
          <Text size={200} weight={isFiltered ? "semibold" : "regular"}>
            {label}
          </Text>
          {isFiltered && (
            <Badge size="small" appearance="filled" color="brand">
              {selected.length}
            </Badge>
          )}
          {(isFiltered || onRemove) && (
            <span
              className={styles.dimissIcon}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                if (isFiltered) {
                  onChange([]);
                } else if (onRemove) {
                  onRemove();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  if (isFiltered) onChange([]);
                  else if (onRemove) onRemove();
                }
              }}
              title={isFiltered ? "Clear filter" : "Remove filter"}
            >
              <DismissRegular fontSize={12} />
            </span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverSurface>
        <div className={styles.popoverBody}>
          {dimension.values.length === 0 ? (
            <Text size={200}>No values available</Text>
          ) : (
            dimension.values.map((v) => (
              <Checkbox
                key={v}
                label={v}
                checked={selected.includes(v)}
                onChange={(_, data) => {
                  if (data.checked) {
                    onChange([...selected, v]);
                  } else {
                    onChange(selected.filter((s) => s !== v));
                  }
                }}
              />
            ))
          )}
        </div>
      </PopoverSurface>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* AddFilterButton                                                     */
/* ------------------------------------------------------------------ */

function AddFilterButton({
  dimensions,
  onAdd,
}: {
  dimensions: FilterDimension[];
  onAdd: (key: string) => void;
}) {
  const styles = useStyles();

  return (
    <Popover trapFocus withArrow>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          icon={<AddRegular />}
          size="small"
        >
          Add filter
        </Button>
      </PopoverTrigger>
      <PopoverSurface>
        <div className={styles.popoverBody}>
          {dimensions.map((d) => (
            <Button
              key={d.key}
              appearance="subtle"
              size="small"
              onClick={() => onAdd(d.key)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </PopoverSurface>
    </Popover>
  );
}
