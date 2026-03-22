import { useMutation } from '@tanstack/react-query'
import { UploadCloud } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { PageShell } from '@/components/shared/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { submitOcrIngest } from '@/lib/api/inventory'

export function OcrPage() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const uploadMutation = useMutation({
    mutationFn: (image: File) => submitOcrIngest(image, setProgress),
  })

  return (
    <PageShell title="OCR 入柜页" description="上传书籍图片并调用 OCR + LLM 匹配，把识别结果落到当前书柜格口。">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>上传图片</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-[rgba(193,198,214,0.4)] bg-[rgba(255,255,255,0.68)] p-8 text-center">
              <div className="rounded-2xl bg-[var(--surface-container-high)] p-4 text-[var(--primary)]">
                <UploadCloud className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-[var(--foreground)]">{file ? file.name : '点击选择书籍封面或书脊图片'}</p>
                <p className="text-sm text-[var(--muted-foreground)]">支持后端当前 OCR 流程的图片文件输入。</p>
              </div>
              <Input
                className="hidden"
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button className="w-full" disabled={!file || uploadMutation.isPending} onClick={() => file && uploadMutation.mutate(file)}>
              {uploadMutation.isPending ? `识别中… ${progress}%` : '开始识别并入柜'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>识别结果</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadMutation.data ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">匹配来源</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{String(uploadMutation.data.source)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                  <p className="font-semibold text-[var(--foreground)]">{String(uploadMutation.data.book?.title ?? '未识别书名')}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    作者：{String(uploadMutation.data.book?.author ?? '待补充')} · 分类：{String(uploadMutation.data.book?.category ?? '待补充')}
                  </p>
                  <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                    已落位格口：{String(uploadMutation.data.slot?.slot_code ?? '—')}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">OCR 文本</p>
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
              <EmptyState title="还没有识别结果" description="上传一张图片后，这里会展示 OCR 文本、命中书目与格口落位信息。" />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
