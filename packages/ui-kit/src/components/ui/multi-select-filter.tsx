"use client";

import { Check, ChevronDown } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type MultiSelectOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type MultiSelectFilterProps<T extends string = string> = {
  options: readonly MultiSelectOption<T>[];
  selected: readonly T[];
  onChange: (values: T[]) => void;
  placeholder: string;
  className?: string;
  contentClassName?: string;
  clearLabel?: string;
  selectedLabel?: (count: number) => string;
  disabled?: boolean;
  ariaLabel?: string;
};

function MultiSelectFilter<T extends string>({
  options,
  selected,
  onChange,
  placeholder,
  className,
  contentClassName,
  clearLabel = "Limpiar selección",
  selectedLabel = (count) => `${count} seleccionados`,
  disabled,
  ariaLabel,
}: MultiSelectFilterProps<T>) {
  const toggle = (value: T) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((option) => option.value === selected[0])?.label ?? placeholder)
        : selectedLabel(selected.length);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "h-9 w-full justify-between gap-2 rounded-full bg-background px-4 font-normal shadow-xs",
            selected.length > 0 && "border-primary text-primary",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-56 p-1", contentClassName)}>
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <div
              key={option.value}
              role="option"
              aria-selected={checked}
              aria-disabled={option.disabled}
              tabIndex={option.disabled ? -1 : 0}
              onClick={() => !option.disabled && toggle(option.value)}
              onKeyDown={(event) => {
                if (!option.disabled && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  toggle(option.value);
                }
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                option.disabled && "pointer-events-none opacity-50",
              )}
            >
              <Checkbox checked={checked} className="pointer-events-none" />
              <span className={cn("truncate", checked && "font-medium")}>{option.label}</span>
              {checked && <Check className="ml-auto size-3.5 text-primary" />}
            </div>
          );
        })}
        {selected.length > 0 && (
          <>
            <div className="my-1 border-t" />
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent"
            >
              {clearLabel}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelectFilter, type MultiSelectFilterProps };
