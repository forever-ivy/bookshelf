import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, WifiOff } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

function resolveVariant(status?: string | null) {
  switch (status) {
    case 'completed':
    case 'delivered':
    case 'idle':
    case 'stored':
    case 'active':
    case 'available':
      return {
        variant: 'success' as const,
        icon: CheckCircle2,
      }
    case 'awaiting_pick':
    case 'assigned':
    case 'carrying':
    case 'arriving':
    case 'delivering':
    case 'processing':
    case 'in_delivery':
    case 'reserved':
      return {
        variant: 'default' as const,
        icon: LoaderCircle,
      }
    case 'created':
    case 'pending':
    case 'returning':
      return {
        variant: 'warning' as const,
        icon: Clock3,
      }
    case 'offline':
    case 'error':
      return {
        variant: 'destructive' as const,
        icon: WifiOff,
      }
    default:
      return {
        variant: 'outline' as const,
        icon: AlertTriangle,
      }
  }
}

export function StatusBadge({ status }: { status?: string | null }) {
  const { variant, icon: Icon } = resolveVariant(status)
  return (
    <Badge variant={variant} className="gap-1.5">
      <Icon className="size-3" />
      <span>{status ?? 'unknown'}</span>
    </Badge>
  )
}
