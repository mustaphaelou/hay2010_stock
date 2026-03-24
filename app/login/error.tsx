'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	useEffect(() => {
		console.error('Login error:', error)
	}, [error])

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Login Error</CardTitle>
					<CardDescription>
						An error occurred. Please try again.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{error.message && (
						<p className="text-sm text-muted-foreground text-center">
							{error.message}
						</p>
					)}
					<div className="flex gap-2 justify-center">
						<Button onClick={() => reset()} variant="default">
							Try again
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
