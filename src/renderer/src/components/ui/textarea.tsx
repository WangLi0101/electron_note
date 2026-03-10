import * as React from 'react'

import { cn } from '../../lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>): React.JSX.Element {
  return (
    <textarea
      className={cn(
        'flex min-h-[120px] w-full rounded-[10px] border border-black/8 bg-white px-3 py-2 text-[13px] text-zinc-800 shadow-sm transition-all duration-200 placeholder:text-[#8e8e93] focus-visible:outline-none focus-visible:border-black/15 focus-visible:ring-2 focus-visible:ring-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white dark:placeholder:text-[#636366] dark:focus-visible:border-white/20 dark:focus-visible:ring-white/10',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
