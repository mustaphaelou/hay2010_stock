import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-20 md:gap-8 md:p-8 md:pb-8">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<Card key={i}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-4 rounded-full" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-20" />
							<Skeleton className="h-3 w-32 mt-2" />
						</CardContent>
					</Card>
				))}
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				<Card className="col-span-4">
					<CardHeader>
						<Skeleton className="h-5 w-32" />
					</CardHeader>
					<CardContent className="pl-2">
						<Skeleton className="h-[300px] w-full" />
					</CardContent>
				</Card>
				<Card className="col-span-3">
					<CardHeader>
						<Skeleton className="h-5 w-32" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-[300px] w-full" />
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
