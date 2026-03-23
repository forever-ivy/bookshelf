import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { InspectorPanel } from '@/components/shared/inspector-panel'
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
  const permissionSummary = useMemo(() => {
    const granted = [
      canManageAlerts ? '警告处理' : null,
      canViewAudit ? '审计记录' : null,
    ].filter(Boolean)
    return granted.join(' / ') || '只读'
  }, [canManageAlerts, canViewAudit])

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
          { label: '当前权限', value: permissionSummary, hint: '按账号权限显示内容' },
        ]}
        className="xl:grid-cols-4"
      />

      <Tabs defaultValue={defaultTab} className="space-y-5">
        <TabsList>
          {canManageAlerts ? <TabsTrigger value="alerts">警告</TabsTrigger> : null}
          {canViewAudit ? <TabsTrigger value="audit">审计</TabsTrigger> : null}
        </TabsList>

        {canManageAlerts ? (
          <TabsContent value="alerts">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <WorkspacePanel title="警告列表" description="按级别、来源和处理动作组织当前警告。">
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

              <InspectorPanel title="处理建议" description="把值班人员最需要看的信息放在右侧。">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">建议先看</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">设备、订单和安全相关警告</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">当前优先级</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                      {criticalAlertCount > 0 ? '有高优先级警告' : '暂无高优先级警告'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-[var(--line-subtle)] bg-white/40 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">处理步骤</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    <li>先确认警告，再去订单、机器人或库存页面处理。</li>
                    <li>处理完后统一标记为已解决。</li>
                    <li>如果只有审计权限，页面会自动变成只读。</li>
                  </ul>
                </div>
              </InspectorPanel>
            </div>
          </TabsContent>
        ) : null}

        {canViewAudit ? (
          <TabsContent value="audit">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <WorkspacePanel title="审计记录" description="按时间顺序查看人工修改、配置变更和权限操作。">
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

              <InspectorPanel title="筛选条件" description="用 action 和 target_type 快速查找记录。">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="audit-action">
                      action
                    </label>
                    <Input
                      id="audit-action"
                      value={auditAction}
                      onChange={(event) => setAuditAction(event.target.value)}
                      placeholder="例如 upsert_admin_role"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="audit-target-type">
                      target_type
                    </label>
                    <Input
                      id="audit-target-type"
                      value={auditTargetType}
                      onChange={(event) => setAuditTargetType(event.target.value)}
                      placeholder="例如 system_role"
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">当前 action</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{auditAction || '全部'}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">当前 target</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{auditTargetType || '全部'}</p>
                  </div>
                </div>
              </InspectorPanel>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </PageShell>
  )
}
