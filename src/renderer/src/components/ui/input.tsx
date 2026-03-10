import * as React from 'react'

import { cn } from '../../lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>): React.JSX.Element {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-[10px] border border-black/8 bg-white px-3 py-2 text-[13px] text-zinc-800 shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-[#8e8e93] focus-visible:outline-none focus-visible:border-black/15 focus-visible:ring-2 focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white dark:placeholder:text-[#636366] dark:focus-visible:border-white/20 dark:focus-visible:ring-white/10',
        className
      )}
      {...props}
    />
  )
}

export { Input }
