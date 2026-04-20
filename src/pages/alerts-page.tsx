import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { STORAGE_KEYS } from '@/constants/constant'
import { ackAdminAlert, getAdminAlerts, getAdminAuditLogs, resolveAdminAlert } from '@/lib/api/management'
import { getAdminPageHero } from '@/lib/page-hero'
import { hasAdminPermission } from '@/lib/permissions'
import { patchSearchParams, readOptionalSearchParam, useOptionalSearchParams } from '@/lib/search-params'
import type { AuthAccount } from '@/types/domain'
import { storageUtils } from '@/utils'
import { formatDateTime } from '@/utils'

const pageHero = getAdminPageHero('alerts')

export function AlertsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useOptionalSearchParams()
  const account = storageUtils.get<AuthAccount>(STORAGE_KEYS.ACCOUNT)
  const canManageAlerts = hasAdminPermission(account, 'alerts.manage')
  const canViewAudit = hasAdminPermission(account, 'system.audit.view')
  const defaultTab = canManageAlerts ? 'alerts' : 'audit'
  const requestedTab = readOptionalSearchParam(searchParams, 'tab')
  const activeTab = requestedTab === 'audit' && canViewAudit ? 'audit' : defaultTab
  const alertStatus = readOptionalSearchParam(searchParams, 'status') ?? 'open'
  const alertSeverity = readOptionalSearchParam(searchParams, 'severity')
  const auditAction = readOptionalSearchParam(searchParams, 'action') ?? ''
  const auditTargetType = readOptionalSearchParam(searchParams, 'target_type') ?? ''

  const alertsQuery = useQuery({
    enabled: canManageAlerts,
    queryKey: ['admin', 'alerts', alertStatus, alertSeverity],
    queryFn: () =>
      getAdminAlerts({
        status: alertStatus,
        severity: alertSeverity,
      }),
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
      eyebrow="异常"
      title="异常"
      description="查看异常和操作记录。"
      statusLine="异常与记录"
    >
      <MetricStrip
        items={[
          { label: '待处理', value: alerts.length, hint: '现在还没处理的异常' },
          { label: '严重异常', value: criticalAlertCount, hint: '影响较大的异常' },
          { label: '操作记录', value: auditLogs.length, hint: '符合当前条件的记录数量' },
        ]}
        className="lg:grid-cols-3"
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setSearchParams(
            patchSearchParams(searchParams, {
              tab: value === defaultTab ? undefined : value,
            }),
            { replace: true },
          )
        }
        className="space-y-5"
      >
        <TabsList className="flex w-fit bg-[var(--surface-container-lowest)] p-1 rounded-full border border-[var(--line-subtle)] shadow-sm">
          {canManageAlerts ? (
            <TabsTrigger
              value="alerts"
              className="rounded-full px-6 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              异常
            </TabsTrigger>
          ) : null}
          {canViewAudit ? (
            <TabsTrigger
              value="audit"
              className="rounded-full px-6 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              操作记录
            </TabsTrigger>
          ) : null}
        </TabsList>

        {canManageAlerts ? (
          <TabsContent value="alerts">
            <WorkspacePanel
              title="异常列表"
              description="按严重程度、来源和处理状态查看当前异常。"
              action={
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-8 items-center gap-2 rounded-full border border-[var(--line-subtle)] bg-[var(--surface-bright)] pl-3 pr-1 transition-colors hover:bg-[var(--surface-container)] focus-within:border-[var(--line-strong)] focus-within:ring-1 focus-within:ring-[var(--line-strong)] shadow-sm">
                    <span className="text-[12px] text-[var(--muted-foreground)] whitespace-nowrap">状态</span>
                    <div className="h-3 w-[1px] bg-[var(--line-subtle)]" />
                    <Select
                      value={alertStatus}
                      onValueChange={(value) =>
                        setSearchParams(
                          patchSearchParams(searchParams, {
                            status: value === 'open' ? undefined : value,
                          }),
                          { replace: true },
                        )
                      }
                    >
                      <SelectTrigger aria-label="警告状态筛选" className="h-full w-auto min-w-[5.5rem] border-0 bg-transparent px-1.5 py-0 text-[12px] font-medium text-[var(--foreground)] shadow-none focus:ring-0">
                        <SelectValue placeholder="待处理" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="open" className="text-[12px] rounded-lg">待处理</SelectItem>
                        <SelectItem value="acknowledged" className="text-[12px] rounded-lg">已确认</SelectItem>
                        <SelectItem value="resolved" className="text-[12px] rounded-lg">已解决</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex h-8 items-center gap-2 rounded-full border border-[var(--line-subtle)] bg-[var(--surface-bright)] pl-3 pr-1 transition-colors hover:bg-[var(--surface-container)] focus-within:border-[var(--line-strong)] focus-within:ring-1 focus-within:ring-[var(--line-strong)] shadow-sm">
                    <span className="text-[12px] text-[var(--muted-foreground)] whitespace-nowrap">级别</span>
                    <div className="h-3 w-[1px] bg-[var(--line-subtle)]" />
                    <Select
                      value={alertSeverity ?? 'all'}
                      onValueChange={(value) =>
                        setSearchParams(
                          patchSearchParams(searchParams, {
                            severity: value === 'all' ? undefined : value,
                          }),
                          { replace: true },
                        )
                      }
                    >
                      <SelectTrigger aria-label="警告级别筛选" className="h-full w-auto min-w-[5.5rem] border-0 bg-transparent px-1.5 py-0 text-[12px] font-medium text-[var(--foreground)] shadow-none focus:ring-0">
                        <SelectValue placeholder="全部级别" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all" className="text-[12px] rounded-lg">全部级别</SelectItem>
                        <SelectItem value="critical" className="text-[12px] rounded-lg">严重</SelectItem>
                        <SelectItem value="warning" className="text-[12px] rounded-lg">警告</SelectItem>
                        <SelectItem value="info" className="text-[12px] rounded-lg">提示</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              }
            >
              {alertsQuery.isLoading ? (
                <LoadingState label="正在载入" />
              ) : alerts.length === 0 ? (
                <EmptyState title="没有找到内容" description="换个条件再试试。" />
              ) : (
                  <div className="grid gap-4">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="rounded-[1.25rem] border border-[var(--line-subtle)] bg-white p-5 shadow-sm transition-all hover:border-[var(--line-strong)] hover:shadow-md">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <StatusBadge status={alert.severity} />
                              <StatusBadge status={alert.status} />
                              <div className="size-1 rounded-full bg-[var(--line-subtle)]" />
                              <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-[var(--muted-foreground)] opacity-60">{alert.source_type}</span>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-[16px] font-bold tracking-tight text-[var(--foreground)] leading-snug">{alert.title}</h3>
                              <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)] font-medium max-w-2xl">
                                {alert.message ?? '暂无详细异常说明。'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-6 min-w-fit">
                            <p className="text-[11px] font-bold text-[var(--muted-foreground)] opacity-50 tracking-wide uppercase">{formatDateTime(alert.created_at)}</p>
                            <div className="flex flex-wrap items-center justify-end gap-2.5">
                              <Button
                                variant="secondary"
                                className="rounded-full h-9 px-5 text-[13px] font-bold transition-all hover:bg-[var(--surface-container-high)] shadow-sm active:scale-[0.98]"
                                onClick={() => acknowledgeMutation.mutate(alert.id)}
                                disabled={acknowledgeMutation.isPending || resolveMutation.isPending}
                              >
                                确认
                              </Button>
                              <Button
                                className="rounded-full h-9 px-5 text-[13px] font-bold shadow-sm active:scale-[0.98] transition-all"
                                onClick={() => resolveMutation.mutate(alert.id)}
                                disabled={acknowledgeMutation.isPending || resolveMutation.isPending}
                              >
                                解决
                              </Button>
                            </div>
                          </div>
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
              title="操作记录"
              description="按时间顺序查看人工修改、配置改动和权限操作。"
              action={(
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-9 items-center gap-3 rounded-full border border-[var(--line-subtle)] bg-white px-3 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-[var(--primary)]/10">
                    <span className="text-[12px] font-semibold text-[var(--muted-foreground)] whitespace-nowrap">名称</span>
                    <Input
                      id="audit-action"
                      value={auditAction}
                      onChange={(event) =>
                        setSearchParams(
                          patchSearchParams(searchParams, {
                            action: event.target.value || undefined,
                          }),
                          { replace: true },
                        )
                      }
                      placeholder="搜索操作..."
                      className="h-full border-0 bg-transparent px-0 text-[12px] focus-visible:ring-0 w-24 sm:w-32"
                    />
                  </div>
                  <div className="flex h-9 items-center gap-3 rounded-full border border-[var(--line-subtle)] bg-white px-3 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-[var(--primary)]/10">
                    <span className="text-[12px] font-semibold text-[var(--muted-foreground)] whitespace-nowrap">对象</span>
                    <Input
                      id="audit-target-type"
                      value={auditTargetType}
                      onChange={(event) =>
                        setSearchParams(
                          patchSearchParams(searchParams, {
                            target_type: event.target.value || undefined,
                          }),
                          { replace: true },
                        )
                      }
                      placeholder="搜索对象..."
                      className="h-full border-0 bg-transparent px-0 text-[12px] focus-visible:ring-0 w-24 sm:w-32"
                    />
                  </div>
                </div>
              )}
            >
              {auditLogsQuery.isLoading ? (
                <LoadingState label="正在载入" />
              ) : auditLogs.length === 0 ? (
                <EmptyState title="没有找到内容" description="换个条件再试试。" />
              ) : (
                <div className="grid gap-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="rounded-[1.25rem] border border-[var(--line-subtle)] bg-white p-5 shadow-sm transition-colors hover:border-[var(--line-strong)]">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status="permission" label="系统操作" />
                            <span className="text-[12px] font-bold tracking-tight text-[var(--foreground)]">
                              对象 #{log.target_ref || log.target_id || '—'}
                            </span>
                          </div>
                          <p className="text-[13px] leading-relaxed text-[var(--foreground)] font-medium">{log.note ?? '无备注'}</p>
                        </div>
                        <p className="text-[12px] font-medium text-[var(--muted-foreground)] opacity-80">{formatDateTime(log.created_at)}</p>
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
