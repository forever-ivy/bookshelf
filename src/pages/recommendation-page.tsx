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
import { STORAGE_KEYS } from '@/constants/constant'
import {
  createAdminRecommendationPlacement,
  createAdminTopicBooklist,
  getAdminRecommendationInsights,
  getAdminRecommendationPlacements,
  getAdminTopicBooklists,
  upsertAdminSystemSetting,
} from '@/lib/api/management'
import { getAdminPageHero } from '@/lib/page-hero'
import { hasAdminPermission } from '@/lib/permissions'
import type { AuthAccount } from '@/types/domain'
import { storageUtils } from '@/utils'

const pageHero = getAdminPageHero('recommendation')

export function RecommendationPage() {
  const queryClient = useQueryClient()
  const [placementForm, setPlacementForm] = useState({
    code: '',
    name: '',
    placement_type: 'homepage',
    status: 'active',
    weight: '0.5',
  })
  const [topicForm, setTopicForm] = useState({
    slug: '',
    title: '',
    description: '',
    status: 'draft',
    audience_segment: '',
    book_ids: '',
  })
  const [strategyForm, setStrategyForm] = useState({
    content: '0.5',
    behavior: '0.3',
    freshness: '0.2',
  })
  const account = storageUtils.get<AuthAccount>(STORAGE_KEYS.ACCOUNT)
  const canManageRecommendation = hasAdminPermission(account, 'recommendation.manage')
  const canEditStrategyWeights = hasAdminPermission(account, 'system.settings.manage')

  const placementsQuery = useQuery({
    queryKey: ['admin', 'recommendation', 'placements'],
    queryFn: getAdminRecommendationPlacements,
  })
  const topicsQuery = useQuery({
    queryKey: ['admin', 'recommendation', 'topics'],
    queryFn: getAdminTopicBooklists,
  })
  const insightsQuery = useQuery({
    queryKey: ['admin', 'recommendation', 'insights'],
    queryFn: getAdminRecommendationInsights,
  })

  const placementMutation = useMutation({
    mutationFn: () =>
      createAdminRecommendationPlacement({
        code: placementForm.code,
        name: placementForm.name,
        placement_type: placementForm.placement_type,
        status: placementForm.status,
        config_json: { weight: Number(placementForm.weight) },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'recommendation'] })
      setPlacementForm({ code: '', name: '', placement_type: 'homepage', status: 'active', weight: '0.5' })
    },
  })

  const topicMutation = useMutation({
    mutationFn: () =>
      createAdminTopicBooklist({
        slug: topicForm.slug,
        title: topicForm.title,
        description: topicForm.description || undefined,
        status: topicForm.status,
        audience_segment: topicForm.audience_segment || undefined,
        book_ids: topicForm.book_ids
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value) && value > 0),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'recommendation'] })
      setTopicForm({
        slug: '',
        title: '',
        description: '',
        status: 'draft',
        audience_segment: '',
        book_ids: '',
      })
    },
  })

  const strategyMutation = useMutation({
    mutationFn: () =>
      upsertAdminSystemSetting('recommendation.weights', {
        value_type: 'json',
        value_json: {
          content: Number(strategyForm.content),
          behavior: Number(strategyForm.behavior),
          freshness: Number(strategyForm.freshness),
        },
        description: '策展与推荐权重',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'recommendation'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'system', 'settings'] })
    },
  })

  const placements = placementsQuery.data?.items ?? []
  const topics = topicsQuery.data?.items ?? []
  const insights = insightsQuery.data
  const isLoading = placementsQuery.isLoading || topicsQuery.isLoading || insightsQuery.isLoading

  useEffect(() => {
    if (!insights) {
      return
    }
    setStrategyForm({
      content: String(insights.strategy_weights.content ?? 0.5),
      behavior: String(insights.strategy_weights.behavior ?? 0.3),
      freshness: String(insights.strategy_weights.freshness ?? 0.2),
    })
  }, [insights])

  const summary = insights?.summary

  return (
    <PageShell
      {...pageHero}
      eyebrow="推荐管理"
      title="推荐管理"
      description="管理推荐位、专题和策略权重。"
      statusLine="推荐设置"
    >
      <MetricStrip
        items={[
          { label: '曝光量', value: summary?.total_recommendations ?? 0, hint: '推荐记录总数' },
          { label: '点击率', value: `${summary?.click_through_rate ?? 0}%`, hint: `${summary?.view_count ?? 0} 次查看` },
          { label: '转化率', value: `${summary?.conversion_rate ?? 0}%`, hint: `${summary?.conversion_count ?? 0} 次转化` },
          { label: '专题数', value: summary?.topic_count ?? 0, hint: `${summary?.placement_count ?? 0} 个推荐位` },
        ]}
        className="xl:grid-cols-4"
      />

      <Tabs defaultValue="placements" className="space-y-5">
        <TabsList>
          <TabsTrigger value="placements">推荐位</TabsTrigger>
          <TabsTrigger value="topics">专题</TabsTrigger>
          <TabsTrigger value="insights">策略</TabsTrigger>
        </TabsList>

        <TabsContent value="placements">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <WorkspacePanel title="推荐位" description="查看首页和专题页的推荐位。">
              {isLoading ? (
                <LoadingState label="加载中" />
              ) : placements.length === 0 ? (
                <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
              ) : (
                <div className="space-y-4">
                  {placements.map((placement) => (
                    <div key={placement.id} className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.4)] px-5 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-[var(--foreground)]">{placement.name}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                            {placement.code} · {placement.placement_type}
                          </p>
                        </div>
                        <StatusBadge status={placement.status} />
                      </div>
                      <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                        权重 {String(placement.config_json?.weight ?? '—')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </WorkspacePanel>

            <InspectorPanel title="新增推荐位" description="快速添加推荐位。">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="placement-code">编码</Label>
                  <Input
                    id="placement-code"
                    value={placementForm.code}
                    onChange={(event) => setPlacementForm((current) => ({ ...current, code: event.target.value }))}
                    placeholder="homepage-secondary"
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="placement-name">名称</Label>
                  <Input
                    id="placement-name"
                    value={placementForm.name}
                    onChange={(event) => setPlacementForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="首页推荐位"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="placement-type">类型</Label>
                    <Input
                      id="placement-type"
                      value={placementForm.placement_type}
                      onChange={(event) => setPlacementForm((current) => ({ ...current, placement_type: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="placement-status">状态</Label>
                    <Input
                      id="placement-status"
                      value={placementForm.status}
                      onChange={(event) => setPlacementForm((current) => ({ ...current, status: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="placement-weight">权重</Label>
                    <Input
                      id="placement-weight"
                      value={placementForm.weight}
                      onChange={(event) => setPlacementForm((current) => ({ ...current, weight: event.target.value }))}
                    />
                  </div>
                </div>
                    <Button
                      type="button"
                      onClick={() => placementMutation.mutate()}
                      disabled={placementMutation.isPending || !canManageRecommendation}
                    >
                  {placementMutation.isPending ? '保存中…' : '创建推荐位'}
                </Button>
                {!canManageRecommendation ? (
                  <p className="text-sm text-[var(--muted-foreground)]">当前账号缺少 `recommendation.manage`，只能查看。</p>
                ) : null}
              </div>
            </InspectorPanel>
          </div>
        </TabsContent>

        <TabsContent value="topics">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <WorkspacePanel title="专题书单" description="按人群和书目关系维护专题书单。">
              {isLoading ? (
                <LoadingState label="加载中" />
              ) : topics.length === 0 ? (
                <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
              ) : (
                <div className="space-y-4">
                  {topics.map((topic) => (
                    <div key={topic.id} className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.4)] px-5 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-[var(--foreground)]">{topic.title}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                            {topic.slug} · 面向 {topic.audience_segment ?? '全部用户'}
                          </p>
                        </div>
                        <StatusBadge status={topic.status} />
                      </div>
                      <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                        {topic.books.map((book) => book.title).join(' / ') || '暂无已挂载图书'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </WorkspacePanel>

            <InspectorPanel title="新增专题书单" description="通过图书 ID 快速生成专题书单。">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic-slug">Slug</Label>
                  <Input id="topic-slug" value={topicForm.slug} onChange={(event) => setTopicForm((current) => ({ ...current, slug: event.target.value }))} placeholder="ai-special" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic-title">标题</Label>
                  <Input id="topic-title" value={topicForm.title} onChange={(event) => setTopicForm((current) => ({ ...current, title: event.target.value }))} placeholder="专题书单" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic-description">简介</Label>
                  <Input
                    id="topic-description"
                    value={topicForm.description}
                    onChange={(event) => setTopicForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="聚焦 AI 与系统设计"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="topic-status">状态</Label>
                    <Input id="topic-status" value={topicForm.status} onChange={(event) => setTopicForm((current) => ({ ...current, status: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="topic-segment">面向人群</Label>
                    <Input
                      id="topic-segment"
                      value={topicForm.audience_segment}
                      onChange={(event) => setTopicForm((current) => ({ ...current, audience_segment: event.target.value }))}
                      placeholder="ai_power_user"
                    />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="topic-books">图书 ID 列表</Label>
                    <Input id="topic-books" value={topicForm.book_ids} onChange={(event) => setTopicForm((current) => ({ ...current, book_ids: event.target.value }))} placeholder="1,2,3" />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => topicMutation.mutate()}
                  disabled={topicMutation.isPending || !canManageRecommendation}
                >
                  {topicMutation.isPending ? '正在创建书单…' : '创建书单'}
                </Button>
                {!canManageRecommendation ? (
                  <p className="text-sm text-[var(--muted-foreground)]">当前账号缺少 `recommendation.manage`，只能查看。</p>
                ) : null}
              </div>
            </InspectorPanel>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <WorkspacePanel title="推荐统计" description="查看标签热度、推荐结果和转化情况。">
              {isLoading ? (
                <LoadingState label="加载中" />
              ) : !insights ? (
                <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
              ) : (
                <div className="space-y-5">
                  <div className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.4)] px-5 py-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">热门标签</p>
                    <div className="mt-4 space-y-3">
                      {insights.hot_tags.length === 0 ? (
                        <p className="text-sm text-[var(--muted-foreground)]">数据还不够，暂时没有热门标签。</p>
                      ) : (
                        insights.hot_tags.map((tag) => (
                          <div key={tag.tag_id} className="flex items-center justify-between gap-3 border-b border-[var(--line-subtle)] pb-3 last:border-b-0 last:pb-0">
                            <p className="font-semibold text-[var(--foreground)]">{tag.tag_name}</p>
                            <span className="text-lg font-semibold text-[var(--foreground)]">{tag.recommendation_count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.4)] px-5 py-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">常见搜索</p>
                    <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                      {insights.top_queries.map((item) => `${item.query_text} (${item.count})`).join(' / ') || '暂无数据'}
                    </p>
                  </div>
                </div>
              )}
            </WorkspacePanel>

            <InspectorPanel title="策略设置" description="调整推荐策略的权重。">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="strategy-content">content</Label>
                    <Input
                      id="strategy-content"
                      value={strategyForm.content}
                      onChange={(event) => setStrategyForm((current) => ({ ...current, content: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strategy-behavior">behavior</Label>
                    <Input
                      id="strategy-behavior"
                      value={strategyForm.behavior}
                      onChange={(event) => setStrategyForm((current) => ({ ...current, behavior: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strategy-freshness">freshness</Label>
                    <Input
                      id="strategy-freshness"
                      value={strategyForm.freshness}
                      onChange={(event) => setStrategyForm((current) => ({ ...current, freshness: event.target.value }))}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={strategyMutation.isPending || !canEditStrategyWeights}
                  onClick={() => strategyMutation.mutate()}
                >
                  {strategyMutation.isPending ? '保存中…' : '保存权重'}
                </Button>
                {!canEditStrategyWeights ? (
                  <div className="rounded-2xl border border-dashed border-[var(--primary)]/30 bg-[var(--primary)]/5 px-5 py-4 text-sm text-[var(--muted-foreground)]">
                    当前账号缺少 `system.settings.manage`，只能查看。
                  </div>
                ) : null}
              </div>
            </InspectorPanel>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
