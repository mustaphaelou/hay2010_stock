"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function Signup01() {
    return (
        <Card className="mx-auto w-full max-w-lg">
            <CardHeader>
                <CardTitle className="text-xl">Sign Up</CardTitle>
                <CardDescription>
                    Enter your information to create an account
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="first-name" className="text-base">First name</Label>
                            <Input id="first-name" placeholder="Max" required className="h-12 text-lg" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="last-name" className="text-base">Last name</Label>
                            <Input id="last-name" placeholder="Robinson" required className="h-12 text-lg" />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-base">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                            className="h-12 text-lg"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password" className="text-base">Password</Label>
                        <Input id="password" type="password" className="h-12 text-lg" />
                    </div>
                    <Button type="submit" className="w-full h-12 text-lg">
                        Create an account
                    </Button>
                    <Button variant="outline" className="w-full h-12 text-lg">
                        Sign up with GitHub
                    </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                    Already have an account?{" "}
                    <Link href="#" className="underline">
                        Sign in
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
