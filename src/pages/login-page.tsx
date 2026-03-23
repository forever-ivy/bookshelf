import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAsAdmin } from '@/lib/api/auth'
import { useSession } from '@/providers/session-provider'

const loginSchema = z.object({
  username: z.string().min(1, '请输入运营凭证'),
  password: z.string().min(1, '请输入验证密钥'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const BACKGROUNDS = [
  '/images/login-bg-1.jpg',
  '/images/login-bg-2.jpg',
  '/images/login-bg-3.jpg',
  '/images/login-bg-4.jpg',
  '/images/login-bg-5.jpg',
  '/images/login-bg-6.jpg',
]

const HERO_MESSAGES = [
  {
    title: '知识流转与治理中台',
    description: '整合馆藏实体、数字资产与自动化运力，构建前瞻性知识运营大脑。',
  },
  {
    title: '馆藏编目与知识校准',
    description: '统一元数据、分类体系与知识图谱标签，让每一次检索都指向更准确的内容秩序。',
  },
  {
    title: '库存作业与格口落位',
    description: '追踪书柜、仓位与流转日志，把盘点、订正和复核收束在同一条作业链路。',
  },
  {
    title: '履约链路与运力调度',
    description: '串联提取、配送、归还与重分配，维持履约节奏与人工介入的稳定平衡。',
  },
  {
    title: '风险监控与系统治理',
    description: '聚合告警、审计与权限边界，确保中台在可控、可追溯的秩序中运行。',
  },
  {
    title: '策展推荐与运营洞察',
    description: '将推荐位、专题版面和趋势洞察并排展开，让内容分发与运营判断彼此呼应。',
  },
]

// Animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  },
}

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, setSession } = useSession()
  const [currentBg, setCurrentBg] = useState(0)

  useEffect(() => {
    // 预加载图片
    BACKGROUNDS.forEach((src) => {
      const img = new Image()
      img.src = src
    })

    const timer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % BACKGROUNDS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: 'admin123',
    },
  })
  const currentHero = HERO_MESSAGES[currentBg] ?? HERO_MESSAGES[0]

  const loginMutation = useMutation({
    mutationFn: loginAsAdmin,
    onSuccess: (payload) => {
      setSession(payload)
      navigate('/dashboard', { replace: true })
    },
  })

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-zinc-900">
      {/* 全屏背景图轮播 */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={currentBg}
            src={BACKGROUNDS[currentBg]}
            alt="Library Background"
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
          />
        </AnimatePresence>
        
        {/* 全局深色渐变蒙层，确保任何背景下右侧面板和左侧文字清晰 */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/40" />
      </div>

      {/* 主内容区域布局 */}
      <div className="relative z-10 flex w-full">
        {/* 左侧文字与标示器部分 */}
        <div className="hidden flex-1 flex-col justify-end p-12 lg:flex xl:p-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mb-8 text-white drop-shadow-md"
          >
            <h2 className="mb-4 text-5xl font-semibold tracking-tight text-white/95">
              {currentHero.title}
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-white/80">
              {currentHero.description}
            </p>
          </motion.div>
          
          {/* 轮播指示器 */}
          <div className="flex gap-2">
            {BACKGROUNDS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBg(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 drop-shadow-sm ${
                  idx === currentBg ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* 右侧玻璃拟态登录面板区域 */}
        <div className="relative z-10 ml-auto flex w-full flex-col lg:w-[500px] xl:w-[560px]">
          <motion.div
            className="flex h-full w-full flex-col justify-center border-l border-white/20 bg-white/60 px-6 py-12 shadow-[-8px_0_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl sm:px-12 lg:px-16"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-8 text-center">
              <img 
                src="/logo.svg" 
                alt="Zhi Xu Logo" 
                className="mx-auto mb-5 size-14 shadow-[0_18px_40px_-24px_rgba(0,91,191,0.9)]" 
              />
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                知序 
              </h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                整合馆藏实体、数字资产与自动化运力，构建前瞻性知识运营大脑。
              </p>
            </motion.div>

            {/* Form */}
            <motion.form 
              variants={itemVariants} 
              className="space-y-6" 
              onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="username" className="text-sm font-semibold text-[var(--foreground)]">运营凭证</Label>
                </div>
                <Input 
                  id="username" 
                  placeholder="输入运营凭证" 
                  className="h-12 border-white/40 bg-white/50 text-base shadow-sm backdrop-blur-sm transition-all placeholder:text-[var(--muted-foreground)]/60 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                  {...form.register('username')} 
                />
                {form.formState.errors.username ? (
                  <p className="text-sm font-medium text-[var(--error)]">{form.formState.errors.username.message}</p>
                ) : null}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-[var(--foreground)]">验证密钥</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="验证密钥" 
                  className="h-12 border-white/40 bg-white/50 text-base shadow-sm backdrop-blur-sm transition-all placeholder:text-[var(--muted-foreground)]/60 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                  {...form.register('password')} 
                />
                {form.formState.errors.password ? (
                  <p className="text-sm font-medium text-[var(--error)]">{form.formState.errors.password.message}</p>
                ) : null}
              </div>

              <Button 
                className="mt-4 w-full rounded-xl py-6 text-base font-semibold shadow-[0_12px_24px_-12px_rgba(0,91,191,0.5)] transition-all hover:scale-[1.01] active:scale-[0.98]" 
                type="submit" 
                disabled={loginMutation.isPending}
              >
                <span>{loginMutation.isPending ? '验证中…' : '验证并进入'}</span>
                <ArrowRight className="ml-2 size-5" />
              </Button>
            </motion.form>
            
            <motion.p variants={itemVariants} className="mt-8 text-center text-xs text-[var(--muted-foreground)]/80">
              登录即代表您同意本中台的治理规则与审计约束
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
