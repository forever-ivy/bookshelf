import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

type SheetContextValue = {
  open: boolean
}

const SheetContext = React.createContext<SheetContextValue>({ open: false })

type SheetProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>

function Sheet({ children, defaultOpen = false, onOpenChange, open: controlledOpen, ...props }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange],
  )

  return (
    <SheetContext.Provider value={{ open }}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </SheetContext.Provider>
  )
}

const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const overlayVariants = {
  open: {
    opacity: 1,
    transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
  },
  closed: {
    opacity: 0,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
} as const

const contentVariants = {
  open: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
  },
  closed: {
    opacity: 0.72,
    x: 88,
    scale: 0.985,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
} as const

function SheetOverlay(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  const prefersReducedMotion = useReducedMotion()
  const { className, ...rest } = props

  return (
    <DialogPrimitive.Overlay asChild {...rest}>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : 'closed'}
        animate="open"
        exit="closed"
        variants={prefersReducedMotion ? undefined : overlayVariants}
        transition={prefersReducedMotion ? { duration: 0.12 } : undefined}
        className={cn('fixed inset-0 z-50 bg-[rgba(22,24,29,0.34)]', className)}
      />
    </DialogPrimitive.Overlay>
  )
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { open } = React.useContext(SheetContext)
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {open && (
        <SheetPortal forceMount>
          <SheetOverlay forceMount />
          <DialogPrimitive.Content ref={ref} asChild forceMount {...props}>
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0, x: 24 } : 'closed'}
              animate="open"
              exit="closed"
              variants={prefersReducedMotion ? undefined : contentVariants}
              transition={prefersReducedMotion ? { duration: 0.16 } : undefined}
              className={cn(
                'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-5 overflow-x-hidden overflow-y-auto border-l border-[var(--line-subtle)] bg-[var(--surface-bright)] px-5 py-5 shadow-[-24px_0_80px_-36px_rgba(16,24,40,0.45)] [will-change:transform,opacity] sm:w-[min(720px,calc(100vw-1.5rem))] sm:rounded-l-[1.75rem] sm:px-6 sm:py-6',
                className,
              )}
              style={{ transformOrigin: 'right center' }}
            >
              {children}
              <DialogPrimitive.Close
                className="absolute right-4 top-4 rounded-full p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[rgba(33,73,140,0.06)] hover:text-[var(--foreground)]"
                aria-label="关闭"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </motion.div>
          </DialogPrimitive.Content>
        </SheetPortal>
      )}
    </AnimatePresence>
  )
})
SheetContent.displayName = DialogPrimitive.Content.displayName

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1 border-b border-[var(--line-subtle)] pb-4 pr-10', className)} {...props} />
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-auto flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', className)} {...props} />
}

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-[1.15rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]', className)}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm leading-6 text-[var(--muted-foreground)]', className)}
    {...props}
  />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
