import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[13px] font-medium transition-all duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-300 [&_svg]:pointer-events-none [&_svg]:size-[15px]',
  {
    variants: {
      variant: {
        default:
          'bg-[#1c1c1e] text-white shadow-sm hover:bg-[#2c2c2e] dark:bg-white dark:text-[#1c1c1e] dark:hover:bg-[#f5f5f7]',
        secondary:
          'bg-[#f2f2f7] text-[#1c1c1e] hover:bg-[#e5e5ea] dark:bg-[#2c2c2e] dark:text-[#f2f2f7] dark:hover:bg-[#3a3a3c]',
        outline:
          'border border-black/[0.08] bg-white/50 backdrop-blur-md text-[#1c1c1e] shadow-sm hover:bg-black/[0.02] dark:border-white/[0.12] dark:bg-[#1c1c1e]/50 dark:text-white dark:hover:bg-white/[0.05]',
        ghost: 'text-[#3a3a3c] hover:bg-black/[0.05] dark:text-[#a1a1aa] dark:hover:bg-white/[0.1]',
        destructive: 'bg-[#ff3b30] text-white hover:bg-[#d70015]'
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-[8px] px-3',
        lg: 'h-10 rounded-[12px] px-8',
        icon: 'h-9 w-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({ className, variant, size, ...props }: ButtonProps): React.JSX.Element {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button }
