import { Badge, cn } from "@safecampus/ui-kit";
import { ChevronRight } from "lucide-react";

import { LOGIN_ROLE_STYLES } from "../login.config";
import type { LoginRole } from "../types";

type LoginRoleOptionProps = {
  role: LoginRole;
  selected: boolean;
  onSelect: (id: LoginRole["id"]) => void;
};

export function LoginRoleOption({
  role,
  selected,
  onSelect,
}: LoginRoleOptionProps) {
  const styles = LOGIN_ROLE_STYLES[role.color];
  const DeviceIcon = role.dispositivo;

  return (
    <button
      type="button"
      onClick={() => onSelect(role.id)}
      className={cn(
        "flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200",
        selected
          ? `${styles.border} bg-gray-50 ring-2 ${styles.ring} ring-offset-1`
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <role.icono className={cn("h-5 w-5", selected ? styles.icon : "text-gray-500")} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold",
              selected ? "text-gray-900" : "text-gray-700",
            )}
          >
            {role.nombre}
          </span>
          <Badge className={cn("gap-1 text-[10px] font-bold", styles.badge)}>
            <DeviceIcon className="h-3 w-3" />
            {role.tag}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-400">{role.descripcion}</p>
      </div>

      {selected && <ChevronRight className={cn("h-4 w-4 shrink-0", styles.icon)} />}
    </button>
  );
}
