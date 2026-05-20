import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StatCard as StatCardType } from '@/types/ui.types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps extends StatCardType {
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)} size="sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {value}
            </p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div
                className={cn(
                  'mt-2 flex items-center gap-1 text-xs font-medium',
                  trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend.positive ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                <span>{trend.value}%</span>
                <span className="font-normal text-muted-foreground">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
              <Icon className="size-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
