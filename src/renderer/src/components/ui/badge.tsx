import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-indigo-600 text-white',
        secondary:
          'border-transparent bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
        outline: 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>): React.JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
