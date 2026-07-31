import { cn } from '@/lib/utils';

/** Loading placeholder that mimics final layout (reduces perceived jank vs a spinner). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
