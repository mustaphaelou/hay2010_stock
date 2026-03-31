import { cn } from "@/lib/utils"
import { SafeIcon as HugeiconsIcon } from "@/components/ui/safe-icon"
import { Loading03Icon } from "@hugeicons/core-free-icons"

interface SpinnerProps extends React.HTMLAttributes<SVGSVGElement> {
    size?: "sm" | "default" | "lg"
}

function Spinner({ className, size = "default", ...props }: SpinnerProps) {
    const sizeClass = {
        sm: "size-3",
        default: "size-4",
        lg: "size-6",
    }[size]

    return (
        <HugeiconsIcon
            icon={Loading03Icon}
            role="status"
            aria-label="Loading"
            className={cn("animate-spin text-primary", sizeClass, className)}
            {...props}
        />
    )
}

export { Spinner }
