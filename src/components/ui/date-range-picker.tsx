
"use client"

import * as React from "react"
import { format, subDays, startOfMonth, endOfMonth, startOfYesterday, endOfYesterday } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "./separator"

interface DateRangePickerProps extends React.ComponentProps<"div"> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

const presets = [
    { name: "Today", range: { from: new Date(), to: new Date() } },
    { name: "Yesterday", range: { from: startOfYesterday(), to: endOfYesterday() } },
    { name: "Last 7 days", range: { from: subDays(new Date(), 6), to: new Date() } },
    { name: "Last 30 days", range: { from: subDays(new Date(), 29), to: new Date() } },
    { name: "This month", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { name: "Last month", range: { from: startOfMonth(subDays(new Date(), 30)), to: endOfMonth(subDays(new Date(), 30)) } },
]

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {

  const handlePresetClick = (range: DateRange) => {
    onDateChange(range);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex flex-col sm:flex-row max-w-[95vw] overflow-hidden shadow-2xl border-slate-200 dark:border-slate-800" align="start">
            <div className="flex flex-col space-y-1 p-3 border-b sm:border-b-0 sm:border-r bg-slate-50/50 dark:bg-slate-900/50 min-w-[140px]">
                <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Presets</p>
                {presets.map((preset) => (
                    <Button 
                        key={preset.name}
                        variant="ghost"
                        size="sm"
                        className="justify-start text-xs h-8 font-medium"
                        onClick={() => handlePresetClick(preset.range)}
                    >
                        {preset.name}
                    </Button>
                ))}
            </div>
            <div className="p-1">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onDateChange}
                numberOfMonths={2}
              />
               <div className="p-2 border-t flex items-center justify-end">
                    <Button onClick={() => onDateChange(undefined)} variant="ghost" size="sm" className="text-xs h-8">Reset Range</Button>
                </div>
            </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
