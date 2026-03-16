import {
  Button,
  Select,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ChevronLeftRegular,
  ChevronRightRegular,
} from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalS,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
});

interface PaginationProps {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
}: PaginationProps) {
  const styles = useStyles();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={styles.container}>
      <Text size={200}>
        {totalItems === 0
          ? "No items"
          : `${start}–${end} of ${totalItems}`}
      </Text>
      <div className={styles.controls}>
        <Select
          size="small"
          value={String(pageSize)}
          onChange={(_, data) => {
            onPageSizeChange(Number(data.value));
            onPageChange(1);
          }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </Select>
        <Button
          appearance="subtle"
          size="small"
          icon={<ChevronLeftRegular />}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        />
        <Text size={200}>
          {currentPage} / {totalPages}
        </Text>
        <Button
          appearance="subtle"
          size="small"
          icon={<ChevronRightRegular />}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        />
      </div>
    </div>
  );
}
