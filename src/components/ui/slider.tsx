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
  // CRITICAL FIX: Base UI error #31 requires a non-undefined value array for controlled inputs.
  // We ensure internalValue is always a valid number array.
  const internalValue = React.useMemo(() => {
    if (!Array.isArray(value) || value.length === 0) return [min];
    // Filter out NaN or undefined values that might have leaked from the store
    const cleaned = value.map(v => (typeof v === 'number' && !isNaN(v)) ? v : min);
    return cleaned;
  }, [value, min]);

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center h-5",
        className
      )}
      value={internalValue}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full grow items-center h-full">
        {/* The target track - we remove overflow-hidden to ensure the thumb is never clipped */}
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-gray-100 overflow-visible">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-orange-500" />
        </SliderPrimitive.Track>
        
        {/* Render Thumbs based on the cleaned value array */}
        {internalValue.map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className={cn(
              "absolute block h-4 w-4 rounded-full border-2 border-orange-500 bg-white shadow-md transition-transform",
              "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
              "cursor-grab active:cursor-grabbing z-10"
            )}
            style={{ 
               // Ensure the thumb is centered relative to the track
               top: '50%',
               transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
