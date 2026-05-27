"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TablePaginationBar } from "@safecampus/ui-kit";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
};

export function IncidentesPagination({ page, totalPages, total, perPage }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const goTo = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <TablePaginationBar
      page={page}
      totalPages={totalPages}
      total={total}
      perPage={perPage}
      isPending={isPending}
      entityLabel="incidentes"
      onPrev={() => goTo(page - 1)}
      onNext={() => goTo(page + 1)}
    />
  );
}
