"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-2",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-sm font-semibold",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        month_grid: "w-full border-collapse space-y-1",
        table: "w-full border-collapse space-y-1",
        weekdays: "flex w-full justify-between mb-1",
        head_row: "flex w-full justify-between mb-1",
        weekday: "text-muted-foreground rounded-md w-9 h-9 flex items-center justify-center font-medium text-[0.8rem] text-center",
        head_cell: "text-muted-foreground rounded-md w-9 h-9 flex items-center justify-center font-medium text-[0.8rem] text-center",
        weeks: "w-full space-y-1",
        week: "flex w-full justify-between mt-1",
        row: "flex w-full justify-between mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center focus-within:relative focus-within:z-20",
        cell: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-md transition-colors hover:bg-accent hover:text-accent-foreground flex items-center justify-center"
        ),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        range_start: "rounded-l-md rounded-r-none bg-primary text-primary-foreground",
        range_end: "rounded-r-md rounded-l-none bg-primary text-primary-foreground",
        day_range_end: "day-range-end",
        range_middle: "bg-accent text-accent-foreground rounded-none",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        today: "bg-accent/60 text-accent-foreground font-semibold",
        day_today: "bg-accent/60 text-accent-foreground font-semibold",
        outside: "text-muted-foreground opacity-40",
        day_outside: "text-muted-foreground opacity-40",
        disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
        day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
        hidden: "invisible",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
        ...props.components,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
