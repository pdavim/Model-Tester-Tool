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
  // CRITICAL FIX: Base UI controlled inputs must receive a valid non-empty array.
  const internalValue = React.useMemo(() => {
    if (Array.isArray(value) && value.length > 0) return value;
    return [min];
  }, [value, min]);

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center group cursor-pointer",
        className
      )}
      value={internalValue}
      onValueChange={(val) => {
        if (onValueChange) onValueChange(Array.isArray(val) ? val : [val]);
      }}
      min={min}
      max={max}
      step={step}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full grow items-center h-5">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-gray-100 overflow-visible group-hover:bg-gray-200 transition-colors">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-orange-500" />
          
          {internalValue.map((_, index) => (
            <SliderPrimitive.Thumb
              key={index}
              className={cn(
                "absolute block h-4 w-4 rounded-full border-2 border-orange-500 bg-white shadow-xl shadow-orange-500/10 transition-transform",
                "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
                "cursor-grab active:cursor-grabbing top-1/2 -translate-y-1/2"
              )}
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider }
