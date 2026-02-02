"use client"

import * as React from "react"
import {
    ChevronLeftIcon,
    ChevronRightIcon,
} from "lucide-react"
import {
    DayPicker,
    type DayButtonProps,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    components,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn(
                "bg-background p-3",
                className
            )}
            classNames={{
                months: "flex gap-4 flex-col sm:flex-row relative",
                month: "flex flex-col gap-4",
                month_caption: "flex justify-center pt-1 relative items-center h-8",
                caption_label: "text-sm font-medium",
                nav: "flex items-center gap-1 absolute top-3 inset-x-3 justify-between z-10",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex items-center justify-center",
                week: "flex w-full mt-2",
                day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "size-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground"
                ),
                range_start: "day-range-start rounded-l-md",
                range_end: "day-range-end rounded-r-md",
                selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                today: "bg-accent text-accent-foreground rounded-md",
                outside: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-50",
                range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    if (orientation === "left") {
                        return <ChevronLeftIcon className="size-4" />
                    }
                    return <ChevronRightIcon className="size-4" />
                },
                DayButton: (props: DayButtonProps) => {
                    const { day, modifiers, className, ...buttonProps } = props
                    return (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "size-9 p-0 font-normal",
                                modifiers.selected && !modifiers.range_middle && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                modifiers.range_start && "bg-primary text-primary-foreground rounded-l-md rounded-r-none",
                                modifiers.range_end && "bg-primary text-primary-foreground rounded-r-md rounded-l-none",
                                modifiers.range_middle && "bg-accent text-accent-foreground rounded-none",
                                modifiers.today && !modifiers.selected && "bg-accent text-accent-foreground",
                                modifiers.outside && "text-muted-foreground opacity-50",
                                modifiers.disabled && "text-muted-foreground opacity-50",
                                className
                            )}
                            {...buttonProps}
                        />
                    )
                },
                ...components,
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export { Calendar }
