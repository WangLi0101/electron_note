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
        'peer h-4 w-4 shrink-0 rounded-full border border-black/15 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/5 focus-visible:ring-offset-1 data-[state=checked]:border-[#1c1c1e] data-[state=checked]:bg-[#1c1c1e] data-[state=checked]:text-white dark:border-white/20 dark:bg-[#1c1c1e] dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-[#1c1c1e]',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3 w-3 stroke-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
