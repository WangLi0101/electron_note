import * as React from 'react'

import { cn } from '../../lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[1.25rem] border border-slate-200/50 bg-white text-slate-800 shadow-xl backdrop-blur-3xl dark:border-slate-800/60 dark:bg-[#0c0c0e]/80 dark:text-slate-100',
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  return <div className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  return <div className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
