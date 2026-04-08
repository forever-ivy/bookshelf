const STATUS_LABELS: Record<string, string> = {
  active: '启用',
  acknowledged: '已查看',
  arriving: '送达中',
  assigned: '已分配',
  awaiting_pick: '待取书',
  available: '可借',
  blacklist: '禁止借阅',
  carrying: '运输中',
  completed: '已完成',
  critical: '严重',
  created: '已创建',
  delivered: '已送达',
  delivering: '配送中',
  draft: '草稿',
  empty: '空闲',
  error: '异常',
  escalated: '继续跟进',
  free: '空闲',
  idle: '空闲',
  inactive: '停用',
  in_delivery: '配送中',
  info: '提示',
  json: 'JSON',
  limited: '借阅受限',
  locked: '锁定',
  maintenance: '维护中',
  manual_review: '转人工处理',
  none: '未设置',
  occupied: '占用',
  off_shelf: '已下架',
  offline: '离线',
  on_shelf: '已上架',
  order_created: '新建订单',
  open: '待处理',
  pending: '待处理',
  permission: '权限',
  picked_from_cabinet: '书柜取书中',
  processing: '处理中',
  received: '已接收',
  reserved: '已预留',
  resolved: '已解决',
  robot_offline: '机器人离线',
  returning: '归还中',
  stored: '已存放',
  task_reassigned: '改派机器人',
  warning: '警告',
}

const ORDER_MODE_LABELS: Record<string, string> = {
  robot_delivery: '机器人送书',
  self_pickup: '到柜自取',
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '加急',
  high: '优先',
  normal: '普通',
  low: '较低',
}

const INTERVENTION_STATUS_LABELS: Record<string, string> = {
  manual_review: '转人工处理',
  escalated: '继续跟进',
  resolved: '已处理',
}

const FULFILLMENT_PHASE_LABELS: Record<string, string> = {
  dispatch_started: '机器人发出',
  in_transit: '配送中',
  pickup_pending: '待取书',
  delivered: '已送达',
  completed: '已完成',
}

const PERMISSION_LABELS: Record<string, string> = {
  'dashboard.view': '首页',
  'books.manage': '图书管理',
  'analytics.view': '借阅统计',
  'inventory.manage': '库存管理',
  'orders.manage': '订单管理',
  'robots.manage': '机器人管理',
  'alerts.manage': '异常提醒',
  'system.audit.view': '操作记录',
  'readers.manage': '读者管理',
  'system.settings.manage': '系统设置',
  'system.roles.manage': '角色权限',
  'recommendation.manage': '推荐设置',
}

const RISK_FLAG_LABELS: Record<string, string> = {
  overdue: '逾期',
  manual_review: '人工处理',
  high_frequency: '借阅频繁',
}

function formatLabel(value: string | null | undefined, labels: Record<string, string>, emptyLabel = '—') {
  if (value === null || value === undefined || value === '') {
    return emptyLabel
  }

  return labels[value] ?? value
}

export function formatStatusLabel(status?: string | null) {
  return formatLabel(status, STATUS_LABELS, '未知状态')
}

export function formatOrderModeLabel(mode?: string | null) {
  return formatLabel(mode, ORDER_MODE_LABELS)
}

export function formatPriorityLabel(priority?: string | null) {
  return formatLabel(priority, PRIORITY_LABELS)
}

export function formatInterventionStatusLabel(status?: string | null) {
  return formatLabel(status, INTERVENTION_STATUS_LABELS)
}

export function formatFulfillmentPhaseLabel(phase?: string | null) {
  return formatLabel(phase, FULFILLMENT_PHASE_LABELS)
}

export function formatPermissionLabel(permission?: string | null) {
  return formatLabel(permission, PERMISSION_LABELS, '页面访问')
}

export function formatRiskFlagLabel(flag?: string | null) {
  return formatLabel(flag, RISK_FLAG_LABELS)
}

export function formatRiskFlagList(flags?: string[] | null) {
  if (!flags || flags.length === 0) {
    return '—'
  }

  return flags.map((flag) => formatRiskFlagLabel(flag)).join(' / ')
}
