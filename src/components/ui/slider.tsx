import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<SliderPrimitive.Root.Props, 'value' | 'onValueChange'> {
  value?: number[]
  onValueChange?: (value: number[]) => void
}

function Slider({
  className,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  ...props
}: SliderProps) {
  // Base UI Slider works with an array of values
  const internalValue = value || [min]

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5 data-[orientation=vertical]:flex-col",
        className
      )}
      value={internalValue}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full grow items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5 data-[orientation=vertical]:flex-col">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-gray-100 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5">
          <SliderPrimitive.Indicator className="absolute h-full bg-orange-500 data-[orientation=vertical]:w-full" />
        </SliderPrimitive.Track>
        {internalValue.map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className="block h-4 w-4 rounded-full border border-orange-200 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:border-orange-500 cursor-grab active:cursor-grabbing shadow-sm"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
