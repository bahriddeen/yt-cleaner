import { Skeleton } from '@/components/ui/misc';

/** Loading state that mirrors the popup's layout to avoid content shift. */
export function PopupSkeleton() {
  return (
    <div className="w-[380px] bg-background p-5">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-8 w-8 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-14" />
        </div>
      </div>
      <div className="mt-6 flex justify-center">
        <Skeleton className="h-[190px] w-[190px] rounded-full" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    </div>
  );
}
