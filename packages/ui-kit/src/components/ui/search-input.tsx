import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "../../lib/utils";
import { Input } from "./input";

type SearchInputProps = React.ComponentProps<typeof Input> & {
  containerClassName?: string;
};

function SearchInput({ className, containerClassName, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative w-full", containerClassName)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        className={cn("rounded-full bg-background pr-4 pl-9", className)}
        {...props}
      />
    </div>
  );
}

export { SearchInput, type SearchInputProps };
