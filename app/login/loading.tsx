import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<Skeleton className="h-8 w-32 mx-auto" />
					<Skeleton className="h-4 w-48 mx-auto mt-2" />
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="space-y-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-10 w-full" />
					</div>
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>
		</div>
	)
}
