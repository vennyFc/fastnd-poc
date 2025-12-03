import { Badge } from "@/components/ui/badge";

export type LifecycleStatus = 'Active' | 'Coming Soon' | 'NFND' | 'Discontinued';

export interface BadgeConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const lifecycleConfig: Record<LifecycleStatus, BadgeConfig> = {
  'Active': { 
    bg: 'bg-green-500/10', 
    text: 'text-green-700 dark:text-green-400', 
    border: 'border-green-500/30',
    dot: 'bg-green-500'
  },
  'Coming Soon': { 
    bg: 'bg-cyan-500/10', 
    text: 'text-cyan-700 dark:text-cyan-400', 
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-500'
  },
  'NFND': { 
    bg: 'bg-orange-500/10', 
    text: 'text-orange-700 dark:text-orange-400', 
    border: 'border-orange-500/30',
    dot: 'bg-orange-500'
  },
  'Discontinued': { 
    bg: 'bg-red-500/10', 
    text: 'text-red-700 dark:text-red-400', 
    border: 'border-red-500/30',
    dot: 'bg-red-500'
  }
};

export const neuBadgeConfig: BadgeConfig = {
  bg: 'bg-blue-500/10',
  text: 'text-blue-700 dark:text-blue-400',
  border: 'border-blue-500/30',
  dot: 'bg-blue-500'
};

export const topBadgeConfig: BadgeConfig = {
  bg: 'bg-amber-500/10',
  text: 'text-amber-700 dark:text-amber-400',
  border: 'border-amber-500/30',
  dot: 'bg-amber-500'
};

export const getLifecycleConfig = (lifecycle: string): BadgeConfig => {
  return lifecycleConfig[lifecycle as LifecycleStatus] || lifecycleConfig['Active'];
};

interface ProductBadgeProps {
  lifecycle?: string | null;
  isNew?: boolean;
  isTop?: boolean;
}

export const renderLifecycleBadge = (lifecycle: string) => {
  const config = getLifecycleConfig(lifecycle);
  return (
    <Badge 
      variant="outline" 
      className={`${config.bg} ${config.text} ${config.border} rounded-full text-xs border`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} animate-pulse mr-1.5`} />
      {lifecycle}
    </Badge>
  );
};

export const renderNeuBadge = () => {
  return (
    <Badge 
      variant="outline" 
      className={`${neuBadgeConfig.bg} ${neuBadgeConfig.text} ${neuBadgeConfig.border} rounded-full text-xs border`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${neuBadgeConfig.dot} animate-pulse mr-1.5`} />
      NPI
    </Badge>
  );
};

export const renderTopBadge = (label: string = 'Top') => {
  return (
    <Badge 
      variant="outline" 
      className={`${topBadgeConfig.bg} ${topBadgeConfig.text} ${topBadgeConfig.border} rounded-full text-xs border`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${topBadgeConfig.dot} animate-pulse mr-1.5`} />
      {label}
    </Badge>
  );
};

export const renderProductBadges = ({ lifecycle, isNew, isTop }: ProductBadgeProps) => {
  const badges: JSX.Element[] = [];
  
  if (lifecycle) {
    badges.push(<span key="lifecycle">{renderLifecycleBadge(lifecycle)}</span>);
  }
  if (isNew) {
    badges.push(<span key="new">{renderNeuBadge()}</span>);
  }
  if (isTop) {
    badges.push(<span key="top">{renderTopBadge()}</span>);
  }
  
  return badges.length > 0 ? (
    <div className="flex flex-wrap gap-1">{badges}</div>
  ) : '-';
};
