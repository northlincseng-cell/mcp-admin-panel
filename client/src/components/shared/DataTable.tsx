import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, Search, Plus } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchKey?: string;
  searchPlaceholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  searchKey,
  searchPlaceholder = "search...",
  onAdd,
  addLabel = "add",
  onRowClick,
  emptyMessage = "no data found",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let result = data;
    if (search && searchKey) {
      const q = search.toLowerCase();
      result = result.filter((row) => {
        const val = row[searchKey];
        return val && String(val).toLowerCase().includes(q);
      });
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const va = a[sortKey] ?? "";
        const vb = b[sortKey] ?? "";
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, searchKey, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {searchKey && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm lowercase"
              data-testid="input-search"
            />
          </div>
        )}
        {onAdd && (
          <Button
            size="sm"
            onClick={onAdd}
            className="ml-auto h-9 lowercase"
            data-testid="button-add"
          >
            <Plus className="h-4 w-4 mr-1" />
            {addLabel}
          </Button>
        )}
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-xs lowercase font-medium ${col.className || ""}`}
                >
                  {col.sortable ? (
                    <button
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => toggleSort(col.key)}
                      data-testid={`sort-${col.key}`}
                    >
                      {col.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-sm text-muted-foreground py-8 lowercase"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => (
                <TableRow
                  key={row.id ?? i}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
                  onClick={() => onRowClick?.(row)}
                  data-testid={`table-row-${row.id ?? i}`}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={`text-sm ${col.className || ""}`}>
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
