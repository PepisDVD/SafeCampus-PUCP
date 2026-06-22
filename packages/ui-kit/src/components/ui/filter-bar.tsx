import * as React from "react";

import { cn } from "../../lib/utils";

function FilterBar({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="filter-bar"
      className={cn("rounded-xl border bg-background p-4 shadow-xs", className)}
      {...props}
    />
  );
}

export { FilterBar };
