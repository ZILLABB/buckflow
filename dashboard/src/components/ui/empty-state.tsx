import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 py-16 px-6", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
