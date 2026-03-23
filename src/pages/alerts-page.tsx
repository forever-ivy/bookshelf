import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { STORAGE_KEYS } from '@/constants/constant'
import { ackAdminAlert, getAdminAlerts, getAdminAuditLogs, resolveAdminAlert } from '@/lib/api/management'
import { getAdminPageHero } from '@/lib/page-hero'
import { hasAdminPermission } from '@/lib/permissions'
import type { AuthAccount } from '@/types/domain'
import { storageUtils } from '@/utils'
import { formatDateTime } from '@/utils'

const pageHero = getAdminPageHero('alerts')

export function AlertsPage() {
  const queryClient = useQueryClient()
  const [auditAction, setAuditAction] = useState('')
  const [auditTargetType, setAuditTargetType] = useState('')
  const account = storageUtils.get<AuthAccount>(STORAGE_KEYS.ACCOUNT)
  const canManageAlerts = hasAdminPermission(account, 'alerts.manage')
  const canViewAudit = hasAdminPermission(account, 'system.audit.view')
  const defaultTab = canManageAlerts ? 'alerts' : 'audit'

  const alertsQuery = useQuery({
    enabled: canManageAlerts,
    queryKey: ['admin', 'alerts'],
    queryFn: () => getAdminAlerts('open'),
  })
  const auditLogsQuery = useQuery({
    enabled: canViewAudit,
    queryKey: ['admin', 'audit-logs', auditAction, auditTargetType],
    queryFn: () =>
      getAdminAuditLogs({
        action: auditAction || undefined,
        target_type: auditTargetType || undefined,
      }),
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) => ackAdminAlert(alertId, '已确认'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (alertId: number) => resolveAdminAlert(alertId, '已解决'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
    },
  })

  const alerts = alertsQuery.data?.items ?? []
  const auditLogs = auditLogsQuery.data?.items ?? []
  const criticalAlertCount = alerts.filter((alert) => alert.severity === 'critical').length

  return (
    <PageShell
      {...pageHero}
      eyebrow="警告管理"
      title="警告管理"
      description="查看警告和审计记录。"
      statusLine="警告和审计"
    >
      <MetricStrip
        items={[
          { label: '待处理', value: alerts.length, hint: '当前处于 open 状态的警告' },
          { label: '高优先级', value: criticalAlertCount, hint: 'severity 为 critical 的警告' },
          { label: '审计记录', value: auditLogs.length, hint: '符合当前筛选条件的变更记录' },
        ]}
        className="lg:grid-cols-3"
      />

      <Tabs defaultValue={defaultTab} className="space-y-5">
        <TabsList>
          {canManageAlerts ? <TabsTrigger value="alerts">警告</TabsTrigger> : null}
          {canViewAudit ? <TabsTrigger value="audit">审计</TabsTrigger> : null}
        </TabsList>

        {canManageAlerts ? (
          <TabsContent value="alerts">
            <WorkspacePanel title="警告列表" description="按级别、来源和处理动作查看当前警告。">
              {alertsQuery.isLoading ? (
                <LoadingState label="加载中" />
              ) : alerts.length === 0 ? (
                <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.4)] px-5 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={alert.severity} />
                            <StatusBadge status={alert.status} />
                            <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{alert.source_type}</span>
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">{alert.title}</h3>
                            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                              {alert.message ?? '暂无说明。'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)]">{formatDateTime(alert.created_at)}</p>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                          variant="secondary"
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          disabled={acknowledgeMutation.isPending || resolveMutation.isPending}
                        >
                          确认
                        </Button>
                        <Button
                          onClick={() => resolveMutation.mutate(alert.id)}
                          disabled={acknowledgeMutation.isPending || resolveMutation.isPending}
                        >
                          解决
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </WorkspacePanel>
          </TabsContent>
        ) : null}

        {canViewAudit ? (
          <TabsContent value="audit">
            <WorkspacePanel
              title="审计记录"
              description="按时间顺序查看人工修改、配置变更和权限操作。"
              action={(
                <div className="flex flex-col gap-3 xl:w-[36rem] xl:flex-row">
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]" htmlFor="audit-action">
                      action
                    </label>
                    <Input
                      id="audit-action"
                      value={auditAction}
                      onChange={(event) => setAuditAction(event.target.value)}
                      placeholder="例如 upsert_admin_role"
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]" htmlFor="audit-target-type">
                      target_type
                    </label>
                    <Input
                      id="audit-target-type"
                      value={auditTargetType}
                      onChange={(event) => setAuditTargetType(event.target.value)}
                      placeholder="例如 system_role"
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              )}
            >
              {auditLogsQuery.isLoading ? (
                <LoadingState label="加载中" />
              ) : auditLogs.length === 0 ? (
                <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.4)] px-5 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={log.action} />
                            <span className="text-sm font-medium text-[var(--foreground)]">
                              {log.target_type} #{log.target_id}
                            </span>
                          </div>
                          <p className="text-sm leading-6 text-[var(--foreground)]">{log.note ?? '无备注'}</p>
                        </div>
                        <p className="text-sm text-[var(--muted-foreground)]">{formatDateTime(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </WorkspacePanel>
          </TabsContent>
        ) : null}
      </Tabs>
    </PageShell>
  )
}
