import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, WifiOff } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatStatusLabel } from '@/lib/display-labels'

function resolveVariant(status?: string | null) {
  switch (status) {
    case 'completed':
    case 'delivered':
    case 'idle':
    case 'stored':
    case 'active':
    case 'available':
    case 'on_shelf':
      return {
        variant: 'success' as const,
        icon: CheckCircle2,
      }
    case 'awaiting_pick':
    case 'assigned':
    case 'carrying':
    case 'arriving':
    case 'delivering':
    case 'picked_from_cabinet':
    case 'processing':
    case 'in_delivery':
    case 'reserved':
    case 'received':
      return {
        variant: 'default' as const,
        icon: LoaderCircle,
      }
    case 'created':
    case 'draft':
    case 'high':
    case 'manual_review':
    case 'pending':
    case 'returning':
    case 'urgent':
      return {
        variant: 'warning' as const,
        icon: Clock3,
      }
    case 'limited':
    case 'low':
    case 'none':
    case 'normal':
    case 'off_shelf':
      return {
        variant: 'outline' as const,
        icon: Clock3,
      }
    case 'blacklist':
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

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const { variant, icon: Icon } = resolveVariant(status)
  return (
    <Badge variant={variant} className="gap-1.5">
      <Icon className="size-3" />
      <span>{label ?? formatStatusLabel(status)}</span>
    </Badge>
  )
}

export { formatStatusLabel } from '@/lib/display-labels'
