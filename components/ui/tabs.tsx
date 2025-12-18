'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'bg-background/40 text-muted-foreground inline-flex h-11 w-fit items-center justify-center rounded-xl border border-border/70 p-1 shadow-[0_18px_45px_rgba(15,23,42,0.55)] backdrop-blur',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all focus-visible:border-ring focus-visible:ring-ring/60 focus-visible:ring-[2px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "hover:text-foreground hover:border-border/60 hover:bg-background/40",
        "data-[state=active]:text-primary data-[state=active]:border-primary/70 data-[state=active]:bg-gradient-to-b data-[state=active]:from-background/90 data-[state=active]:to-background/60 data-[state=active]:shadow-[0_12px_40px_rgba(59,130,246,0.6)]",
        "data-[state=active]:before:absolute data-[state=active]:before:inset-x-3 data-[state=active]:before:-bottom-2 data-[state=active]:before:h-0.5 data-[state=active]:before:rounded-full data-[state=active]:before:bg-gradient-to-r data-[state=active]:before:from-primary/0 data-[state=active]:before:via-primary data-[state=active]:before:to-primary/0",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
