"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"

const checkboxVariants = cva(
  "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
  {
    variants: {
      variant: {
        default: "",
        outline: "border-input bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface CheckboxItemProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {}

const CheckboxItem = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxItemProps
>(({ className, variant, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(checkboxVariants({ variant }), className)}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
CheckboxItem.displayName = "CheckboxItem"

const CheckboxGroupContext = React.createContext<{
  value: string[]
  onValueChange?: (value: string[]) => void
}>({
  value: [],
  onValueChange: () => {},
})

interface CheckboxGroupProps {
  value?: string[]
  onValueChange?: (value: string[]) => void
  children: React.ReactNode
  className?: string
}

function CheckboxGroup({
  value = [],
  onValueChange,
  children,
  className,
}: CheckboxGroupProps) {
  console.log("CheckboxGroup received value:", value);
  return (
    <CheckboxGroupContext.Provider value={{ value, onValueChange }}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </CheckboxGroupContext.Provider>
  )
}

// Wrap the CheckboxItem to add context awareness
const ContextCheckboxItem = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  Omit<CheckboxItemProps, "checked" | "onCheckedChange"> & { value: string }
>(({ value, ...props }, ref) => {
  const { value: groupValue, onValueChange } = React.useContext(CheckboxGroupContext)
  
  console.log("ContextCheckboxItem:", { value, isChecked: groupValue.includes(value), groupValue });
  
  return (
    <CheckboxItem
      ref={ref}
      checked={groupValue.includes(value)}
      onCheckedChange={(checked) => {
        if (typeof checked === "boolean") {
          onValueChange?.(
            checked 
              ? [...groupValue, value]
              : groupValue.filter((v) => v !== value)
          )
        }
      }}
      value={value}
      {...props}
    />
  )
})
ContextCheckboxItem.displayName = "ContextCheckboxItem"

export { CheckboxGroup, ContextCheckboxItem as CheckboxItem } 