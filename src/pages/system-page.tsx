import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { InspectorPanel } from '@/components/shared/inspector-panel'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { STORAGE_KEYS } from '@/constants/constant'
import {
  getAdminSystemAdmins,
  getAdminSystemPermissions,
  getAdminSystemRoles,
  getAdminSystemSettings,
  upsertAdminSystemRole,
  upsertAdminSystemSetting,
} from '@/lib/api/management'
import { getAdminPageHero } from '@/lib/page-hero'
import { hasAdminPermission } from '@/lib/permissions'
import type { AuthAccount } from '@/types/domain'
import { storageUtils } from '@/utils'

const EMPTY_SETTING_EDITOR = {
  settingKey: '',
  valueType: 'json',
  description: '',
  valueJsonText: '{\n  \n}',
}

const EMPTY_ROLE_EDITOR = {
  roleCode: '',
  name: '',
  description: '',
  permissionCodes: '',
  adminIds: '',
}

const pageHero = getAdminPageHero('system')

export function SystemPage() {
  const queryClient = useQueryClient()
  const account = storageUtils.get<AuthAccount>(STORAGE_KEYS.ACCOUNT)
  const canManageSettings = hasAdminPermission(account, 'system.settings.manage')
  const canManageRoles = hasAdminPermission(account, 'system.roles.manage')
  const defaultTab = canManageSettings ? 'settings' : 'roles'

  const settingsQuery = useQuery({
    enabled: canManageSettings,
    queryKey: ['admin', 'system', 'settings'],
    queryFn: getAdminSystemSettings,
  })
  const permissionsQuery = useQuery({
    enabled: canManageRoles,
    queryKey: ['admin', 'system', 'permissions'],
    queryFn: getAdminSystemPermissions,
  })
  const rolesQuery = useQuery({
    enabled: canManageRoles,
    queryKey: ['admin', 'system', 'roles'],
    queryFn: getAdminSystemRoles,
  })
  const adminsQuery = useQuery({
    enabled: canManageRoles,
    queryKey: ['admin', 'system', 'admins'],
    queryFn: getAdminSystemAdmins,
  })

  const [settingEditor, setSettingEditor] = useState(EMPTY_SETTING_EDITOR)
  const [roleEditor, setRoleEditor] = useState(EMPTY_ROLE_EDITOR)

  useEffect(() => {
    if (!canManageSettings) {
      return
    }
    const firstSetting = settingsQuery.data?.items[0]
    if (!firstSetting) {
      return
    }
    setSettingEditor({
      settingKey: firstSetting.setting_key,
      valueType: firstSetting.value_type,
      description: firstSetting.description ?? '',
      valueJsonText: JSON.stringify(firstSetting.value_json, null, 2),
    })
  }, [canManageSettings, settingsQuery.data?.items])

  useEffect(() => {
    if (!canManageRoles) {
      return
    }
    const firstRole = rolesQuery.data?.items[0]
    if (!firstRole) {
      return
    }
    setRoleEditor({
      roleCode: firstRole.code,
      name: firstRole.name,
      description: firstRole.description ?? '',
      permissionCodes: firstRole.permission_codes.join(','),
      adminIds: firstRole.assigned_admin_ids.join(','),
    })
  }, [canManageRoles, rolesQuery.data?.items])

  const saveSettingMutation = useMutation({
    mutationFn: async () => {
      const parsedJson = JSON.parse(settingEditor.valueJsonText) as Record<string, unknown>
      return upsertAdminSystemSetting(settingEditor.settingKey, {
        value_type: settingEditor.valueType,
        value_json: parsedJson,
        description: settingEditor.description || undefined,
      })
    },
    onSuccess: (setting) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'settings'] })
      setSettingEditor({
        settingKey: setting.setting_key,
        valueType: setting.value_type,
        description: setting.description ?? '',
        valueJsonText: JSON.stringify(setting.value_json, null, 2),
      })
    },
  })

  const saveRoleMutation = useMutation({
    mutationFn: () =>
      upsertAdminSystemRole(roleEditor.roleCode, {
        name: roleEditor.name,
        description: roleEditor.description || undefined,
        permission_codes: roleEditor.permissionCodes
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        admin_ids: roleEditor.adminIds
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((value) => Number.isFinite(value) && value > 0),
      }),
    onSuccess: (role) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'roles'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
      setRoleEditor({
        roleCode: role.code,
        name: role.name,
        description: role.description ?? '',
        permissionCodes: role.permission_codes.join(','),
        adminIds: role.assigned_admin_ids.join(','),
      })
    },
  })

  const settings = settingsQuery.data?.items ?? []
  const permissions = permissionsQuery.data?.items ?? []
  const roles = rolesQuery.data?.items ?? []
  const admins = adminsQuery.data?.items ?? []

  return (
    <PageShell
      {...pageHero}
      eyebrow="系统设置"
      title="系统设置"
      description="管理配置、角色和权限。"
      statusLine="配置和权限"
    >
      <MetricStrip
        items={[
          { label: '配置数', value: settings.length, hint: '系统配置条目' },
          { label: '角色数', value: roles.length, hint: '当前可分配的角色' },
          { label: '权限数', value: permissions.length, hint: '已注册的权限' },
          { label: '管理员数', value: admins.length, hint: '可分配角色的管理员' },
        ]}
        className="xl:grid-cols-4"
      />

      <Tabs defaultValue={defaultTab} className="space-y-5">
        <TabsList>
          {canManageSettings ? <TabsTrigger value="settings">配置</TabsTrigger> : null}
          {canManageRoles ? <TabsTrigger value="roles">角色</TabsTrigger> : null}
        </TabsList>

        {canManageSettings ? (
          <TabsContent value="settings">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <WorkspacePanel title="系统配置" description="查看和修改系统配置。">
                {settingsQuery.isLoading ? (
                  <LoadingState label="加载中" />
                ) : settings.length === 0 ? (
                  <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
                ) : (
                  <div className="space-y-4">
                    {settings.map((setting) => (
                      <div key={setting.id} className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.4)] px-5 py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-1">
                            <p className="text-lg font-semibold text-[var(--foreground)]">{setting.setting_key}</p>
                            <p className="text-sm text-[var(--muted-foreground)]">{setting.description ?? '暂无描述'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={setting.value_type} />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                setSettingEditor({
                                  settingKey: setting.setting_key,
                                  valueType: setting.value_type,
                                  description: setting.description ?? '',
                                  valueJsonText: JSON.stringify(setting.value_json, null, 2),
                                })
                              }
                            >
                              编辑此项
                            </Button>
                          </div>
                        </div>
                        <pre className="mt-4 overflow-x-auto rounded-2xl bg-[var(--surface-container-low)] p-4 text-sm text-[var(--foreground)]">
                          {JSON.stringify(setting.value_json, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </WorkspacePanel>

          <InspectorPanel title="配置编辑" description="可以更新现有配置，也可以新增配置。">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="setting-key">配置 Key</Label>
                      <Input
                        id="setting-key"
                        value={settingEditor.settingKey}
                        onChange={(event) => setSettingEditor((current) => ({ ...current, settingKey: event.target.value }))}
                        placeholder="borrow.rules"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="value-type">值类型</Label>
                      <Input
                        id="value-type"
                        value={settingEditor.valueType}
                        onChange={(event) => setSettingEditor((current) => ({ ...current, valueType: event.target.value }))}
                        placeholder="json"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setting-description">配置描述</Label>
                    <Input
                      id="setting-description"
                      value={settingEditor.description}
                      onChange={(event) => setSettingEditor((current) => ({ ...current, description: event.target.value }))}
                      placeholder="例如：借阅规则、配送范围、推荐算法参数"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setting-json">JSON 值</Label>
                    <Textarea
                      id="setting-json"
                      value={settingEditor.valueJsonText}
                      onChange={(event) => setSettingEditor((current) => ({ ...current, valueJsonText: event.target.value }))}
                      placeholder='{\n  "max_days": 30,\n  "max_count": 5\n}'
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full md:w-auto"
                    disabled={saveSettingMutation.isPending || !settingEditor.settingKey.trim()}
                    onClick={() => saveSettingMutation.mutate()}
                  >
                    {saveSettingMutation.isPending ? '保存中…' : '保存配置'}
                  </Button>
                </div>
              </InspectorPanel>
            </div>
          </TabsContent>
        ) : null}

        {canManageRoles ? (
          <TabsContent value="roles">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <WorkspacePanel title="角色列表" description="查看角色和对应权限。">
                  {rolesQuery.isLoading ? (
                    <LoadingState label="加载中" />
                  ) : roles.length === 0 ? (
                    <EmptyState title="暂无角色" description="先在右侧创建角色。" />
                  ) : (
                    <div className="space-y-4">
                      {roles.map((role) => (
                        <div key={role.id} className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.4)] px-5 py-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                              <p className="text-lg font-semibold text-[var(--foreground)]">{role.name}</p>
                              <p className="text-sm text-[var(--muted-foreground)]">
                                {role.code} · {role.description ?? '暂无角色描述'}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                setRoleEditor({
                                  roleCode: role.code,
                                  name: role.name,
                                  description: role.description ?? '',
                                  permissionCodes: role.permission_codes.join(','),
                                  adminIds: role.assigned_admin_ids.join(','),
                                })
                              }
                            >
                              编辑角色
                            </Button>
                          </div>
                          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                            权限：{role.permission_codes.join(' / ') || '暂无权限'}
                          </p>
                          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                            分配管理员：{role.assigned_admin_ids.join(', ') || '暂无管理员'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </WorkspacePanel>

                <WorkspacePanel title="权限列表" description="查看系统里已经注册的权限。">
                  {permissionsQuery.isLoading ? (
                    <LoadingState label="加载中" />
                  ) : (
                    <div className="space-y-3">
                      {permissions.map((permission) => (
                        <div key={permission.id} className="rounded-[1.3rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.36)] px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[var(--foreground)]">{permission.name}</p>
                              <p className="text-sm text-[var(--muted-foreground)]">{permission.code}</p>
                            </div>
                            <StatusBadge status="permission" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </WorkspacePanel>
              </div>

              <div className="space-y-6">
                <WorkspacePanel title="管理员列表" description="查看当前管理员和已有角色。">
                  {adminsQuery.isLoading ? (
                    <LoadingState label="加载中" />
                  ) : (
                    <div className="space-y-3">
                      {admins.map((admin) => (
                        <div key={admin.id} className="rounded-[1.3rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.36)] px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[var(--foreground)]">{admin.username}</p>
                              <p className="text-sm text-[var(--muted-foreground)]">ID {admin.id}</p>
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)]">{admin.role_codes.join(' / ') || '暂无角色'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </WorkspacePanel>

          <InspectorPanel title="编辑角色" description="通过角色编码、权限列表和管理员 ID 调整角色。">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="role-code">角色编码</Label>
                        <Input
                          id="role-code"
                          value={roleEditor.roleCode}
                          onChange={(event) => setRoleEditor((current) => ({ ...current, roleCode: event.target.value }))}
                          placeholder="ops-manager"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role-name">角色名称</Label>
                        <Input
                          id="role-name"
                          value={roleEditor.name}
                          onChange={(event) => setRoleEditor((current) => ({ ...current, name: event.target.value }))}
                          placeholder="运营管理员"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role-description">角色描述</Label>
                      <Input
                        id="role-description"
                        value={roleEditor.description}
                        onChange={(event) => setRoleEditor((current) => ({ ...current, description: event.target.value }))}
                        placeholder="负责日常运营和警告处理"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role-permissions">权限编码列表</Label>
                      <Textarea
                        id="role-permissions"
                        value={roleEditor.permissionCodes}
                        onChange={(event) => setRoleEditor((current) => ({ ...current, permissionCodes: event.target.value }))}
                        placeholder="dashboard.view,alerts.manage,system.audit.view"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role-admins">管理员 ID 列表</Label>
                      <Input
                        id="role-admins"
                        value={roleEditor.adminIds}
                        onChange={(event) => setRoleEditor((current) => ({ ...current, adminIds: event.target.value }))}
                        placeholder="1,2"
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full md:w-auto"
                      disabled={saveRoleMutation.isPending || !roleEditor.roleCode.trim() || !roleEditor.name.trim()}
                      onClick={() => saveRoleMutation.mutate()}
                    >
                      {saveRoleMutation.isPending ? '保存中…' : '保存角色'}
                    </Button>
                  </div>
                </InspectorPanel>
              </div>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </PageShell>
  )
}
