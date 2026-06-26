import { Skeleton } from "@safecampus/ui-kit";

export default function Loading() {
  return (
    <div className="space-y-5 p-6">
      <Skeleton className="h-4 w-56" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
}
