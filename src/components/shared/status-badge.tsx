import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, WifiOff } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

const STATUS_LABELS: Record<string, string> = {
  active: '启用',
  available: '可用',
  assigned: '已分配',
  arriving: '送达中',
  awaiting_pick: '待取书',
  carrying: '运输中',
  completed: '已完成',
  created: '已创建',
  delivered: '已送达',
  delivering: '配送中',
  empty: '空闲',
  error: '异常',
  free: '空闲',
  idle: '空闲',
  in_delivery: '配送中',
  maintenance: '维护中',
  offline: '离线',
  occupied: '占用',
  open: '待处理',
  pending: '待处理',
  processing: '处理中',
  reserved: '已预留',
  resolved: '已解决',
  returning: '归还中',
  stored: '已存放',
  acknowledged: '已确认',
}

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

export function formatStatusLabel(status?: string | null) {
  if (!status) {
    return '未知状态'
  }

  return STATUS_LABELS[status] ?? '未知状态'
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
