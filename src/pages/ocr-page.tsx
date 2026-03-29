import { useMutation } from '@tanstack/react-query'
import { ScanSearch, UploadCloud } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { InspectorPanel } from '@/components/shared/inspector-panel'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { submitOcrIngest } from '@/lib/api/inventory'
import { getAdminPageHero } from '@/lib/page-hero'

const pageHero = getAdminPageHero('ocr')

export function OcrPage() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const uploadMutation = useMutation({
    mutationFn: (image: File) => submitOcrIngest(image, setProgress),
  })

  return (
    <PageShell
      {...pageHero}
      eyebrow="入库识别"
      title="入库识别"
      description="上传图片后识别图书，并给出建议放置位置。"
      statusLine="图片识别"
    >
      <MetricStrip
        items={[
          { label: '当前文件', value: file?.name ?? '未选择', hint: '上传书籍封面或书脊图片' },
          { label: '识别进度', value: `${progress}%`, hint: uploadMutation.isPending ? '正在识别' : '等待开始' },
          { label: '识别结果', value: uploadMutation.data?.book?.title ?? '未识别', hint: '识别成功后会显示图书名称' },
          { label: '建议格口', value: uploadMutation.data?.slot?.slot_code ?? '—', hint: '识别完成后会给出建议位置' },
        ]}
        className="xl:grid-cols-4"
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <WorkspacePanel title="识别区" description="先上传图片，再开始识别和匹配。">
          <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center gap-4 rounded-[1.85rem] border border-dashed border-[var(--line-strong)]/40 bg-[rgba(255,255,255,0.46)] p-8 text-center">
            <div className="rounded-2xl bg-[var(--surface-container-high)] p-4 text-[var(--primary)]">
              <UploadCloud className="size-6" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-[var(--foreground)]">{file ? file.name : '选择图片'}</p>
              <p className="max-w-md text-sm leading-6 text-[var(--muted-foreground)]">建议上传封面或书脊清晰的图片，识别会更稳定。</p>
            </div>
            <Input
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="min-w-44" disabled={!file || uploadMutation.isPending} onClick={() => file && uploadMutation.mutate(file)}>
              {uploadMutation.isPending ? `识别中… ${progress}%` : '开始识别'}
              </Button>
              <Button type="button" variant="secondary" disabled={!file || uploadMutation.isPending} onClick={() => setFile(null)}>
              清空文件
              </Button>
            </div>
        </WorkspacePanel>

        <div className="space-y-6">
          <InspectorPanel title="识别结果" description="右侧显示识别来源、图书和仓位结果，方便检查。">
            {uploadMutation.data ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">匹配来源</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{String(uploadMutation.data.source)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">图书</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{String(uploadMutation.data.book?.title ?? '未识别')}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    作者：{String(uploadMutation.data.book?.author ?? '暂未填写')} · 分类：{String(uploadMutation.data.book?.category ?? '暂未填写')}
                  </p>
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">建议格口：{String(uploadMutation.data.slot?.slot_code ?? '—')}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">识别到的文字</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(uploadMutation.data.ocr_texts as string[] | undefined)?.map((item) => (
                      <span key={item} className="rounded-full bg-white px-3 py-1 text-xs text-[var(--muted-foreground)]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="没有找到内容" description="上传图片后会显示识别结果。" />
            )}
          </InspectorPanel>

          <WorkspacePanel title="使用提示" description="为了提高识别成功率，请让书名、作者或 ISBN 至少有一项拍清楚。">
            <div className="flex items-start gap-3 rounded-[1.35rem] bg-[var(--surface-container-low)] px-4 py-4">
              <div className="rounded-xl border border-[var(--line-subtle)] bg-white/60 p-2 text-[var(--primary)]">
                <ScanSearch className="size-4" />
              </div>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                如果图片太远或太糊，可以换更清晰的封面图；如果识别不准，先补齐 ISBN、条码和封面信息。
              </p>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </PageShell>
  )
}
