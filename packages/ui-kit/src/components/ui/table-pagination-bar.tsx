"use client";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

type TablePaginationBarProps = {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  isPending?: boolean;
  entityLabel?: string;
  onPrev: () => void;
  onNext: () => void;
};

export function TablePaginationBar({
  page,
  totalPages,
  total,
  perPage,
  isPending = false,
  entityLabel = "registros",
  onPrev,
  onNext,
}: TablePaginationBarProps) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-slate-500">
      <span>
        {total === 0
          ? `Sin ${entityLabel}`
          : `${total} ${entityLabel} · página ${page} de ${totalPages}`}
        {total > 0 && totalPages > 1 && (
          <span className="ml-1 text-slate-400">
            ({from}–{to})
          </span>
        )}
      </span>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              className={
                page <= 1 || isPending
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
              onClick={(e) => {
                e.preventDefault();
                if (page > 1 && !isPending) onPrev();
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              className={
                page >= totalPages || isPending
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
              onClick={(e) => {
                e.preventDefault();
                if (page < totalPages && !isPending) onNext();
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
