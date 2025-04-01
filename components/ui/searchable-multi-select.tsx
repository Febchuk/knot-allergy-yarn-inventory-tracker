"use client"

import * as React from "react"
import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type OptionType = {
  label: string
  value: string
  description?: string
}

interface SearchableMultiSelectProps {
  options: OptionType[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  maxDisplayItems?: number
  loading?: boolean
}

export function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  emptyMessage = "No items found.",
  className,
  maxDisplayItems = 3,
  loading = false,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (option.description && option.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  
  // Get labels for selected values
  const selectedLabels = selected.map(value => {
    const option = options.find(opt => opt.value === value)
    return option?.label || value
  })
  
  // Create badge content with count indicator
  const displayItems = selectedLabels.slice(0, maxDisplayItems)
  const additionalCount = selected.length - maxDisplayItems
  
  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value))
    } else {
      onChange([...selected, value])
    }
  }
  
  const handleRemoveAll = () => {
    onChange([])
  }
  
  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(item => item !== value))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <>
                {displayItems.map((label, i) => (
                  <Badge key={i} variant="secondary" className="mr-1">
                    {label}
                    <X 
                      className="ml-1 h-3 w-3 cursor-pointer" 
                      onClick={(e) => handleRemove(selected[i], e)}
                    />
                  </Badge>
                ))}
                {additionalCount > 0 && (
                  <Badge variant="secondary">+{additionalCount} more</Badge>
                )}
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command className={cn("w-full")}>
          <CommandInput 
            placeholder="Search..." 
            onValueChange={setSearchQuery}
            className="h-9"
          />
          {loading ? (
            <div className="py-6 text-center text-sm">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandList>
                <CommandGroup className="max-h-64 overflow-y-auto">
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        handleSelect(option.value);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between px-2 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4 min-w-4",
                          selected.includes(option.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              {selected.length > 0 && (
                <div className="flex items-center justify-between p-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {selected.length} selected
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRemoveAll}
                    className="h-7 px-2 text-xs"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
} 