"use client"

import * as React from "react"
import { format, subDays, startOfMonth, endOfMonth, startOfYesterday, endOfYesterday, isSameDay } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date?: DateRange
    onDateChange?: (date: DateRange | undefined) => void
}

export function DateRangePicker({
    className,
    date,
    onDateChange,
}: DateRangePickerProps) {
    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal h-10 px-3",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd/MM/yyyy")} -{" "}
                                    {format(date.to, "dd/MM/yyyy")}
                                </>
                            ) : (
                                format(date.from, "dd/MM/yyyy")
                            )
                        ) : (
                            <span>Sélectionner une date</span>
                        )}
                        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex border-b p-2 gap-1 overflow-x-auto whitespace-nowrap">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => onDateChange?.({ from: new Date(), to: new Date() })}
                        >
                            Aujourd'hui
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => onDateChange?.({ from: startOfYesterday(), to: endOfYesterday() })}
                        >
                            Hier
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => onDateChange?.({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
                        >
                            Ce mois
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => onDateChange?.(undefined)}
                        >
                            Tout
                        </Button>
                    </div>
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={onDateChange}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
