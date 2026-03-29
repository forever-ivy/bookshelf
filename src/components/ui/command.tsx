import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] bg-[rgba(255,251,244,0.98)] text-[var(--foreground)]',
      className,
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, onCompositionEnd, onCompositionStart, onKeyDown, onValueChange, value, ...props }, ref) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const composingRef = React.useRef(false)
  // Keep a local draft so IME composition can continue even while the parent defers commits.
  const [draftValue, setDraftValue] = React.useState(value ?? '')

  React.useEffect(() => {
    if (!composingRef.current) {
      setDraftValue(value ?? '')
    }
  }, [value])

  return (
    <div className="flex items-center gap-3 border-b border-[var(--line-subtle)] px-5 py-4" cmdk-input-wrapper="">
      <Search className="size-4 shrink-0 text-[var(--muted-foreground)]" />
      <CommandPrimitive.Input
        ref={(node) => {
          inputRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
        }}
        className={cn(
          'flex h-11 w-full border-0 bg-transparent px-0 text-base outline-none placeholder:text-[var(--muted-foreground)] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        value={draftValue}
        onValueChange={(v) => {
          setDraftValue(v)
          if (!composingRef.current) {
            onValueChange?.(v)
          }
        }}
        onCompositionStart={(event) => {
          composingRef.current = true
          onCompositionStart?.(event)
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false
          const finalValue = event.currentTarget.value
          setDraftValue(finalValue)
          onValueChange?.(finalValue)
          onCompositionEnd?.(event)
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) {
            e.stopPropagation()
          }
          onKeyDown?.(e)
        }}
        {...props}
      />
    </div>
  )
})
CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[min(65vh,34rem)] overflow-y-auto overflow-x-hidden px-3 py-3', className)}
    {...props}
  />
))
CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn('px-4 py-8 text-center text-sm text-[var(--muted-foreground)]', className)}
    {...props}
  />
))
CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden px-1 py-2 text-[var(--foreground)] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-[var(--muted-foreground)]',
      className,
    )}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 h-px bg-[var(--line-subtle)]', className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-3 rounded-2xl px-3 py-3 text-sm outline-none transition-colors data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-[rgba(33,73,140,0.08)] data-[selected=true]:text-[var(--foreground)]',
      className,
    )}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn('ml-auto text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]', className)}
    {...props}
  />
)
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
