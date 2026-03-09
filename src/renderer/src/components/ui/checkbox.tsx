import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

import { cn } from '../../lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>): React.JSX.Element {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white data-[state=checked]:border-zinc-600 data-[state=checked]:bg-zinc-600 data-[state=checked]:text-white dark:border-slate-600 dark:bg-slate-900 dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-slate-950 dark:data-[state=checked]:border-zinc-500 dark:data-[state=checked]:bg-zinc-500',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3.5 w-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
