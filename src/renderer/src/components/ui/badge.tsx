import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#1c1c1e] text-white dark:bg-white dark:text-[#1c1c1e]',
        secondary: 'border-transparent bg-black/5 text-[#1c1c1e] dark:bg-white/10 dark:text-white',
        outline: 'border-black/10 text-[#8e8e93] dark:border-white/20 dark:text-[#8e8e93]'
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
