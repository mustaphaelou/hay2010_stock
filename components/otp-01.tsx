"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp"

export function Otp01() {
    return (
        <Card className="mx-auto w-full max-w-lg">
            <CardHeader>
                <CardTitle className="text-2xl">One-Time Password</CardTitle>
                <CardDescription>
                    Please enter the one-time password sent to your phone.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4 items-center">
                    <InputOTP maxLength={6}>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} className="w-12 h-12 text-lg" />
                            <InputOTPSlot index={1} className="w-12 h-12 text-lg" />
                            <InputOTPSlot index={2} className="w-12 h-12 text-lg" />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                            <InputOTPSlot index={3} className="w-12 h-12 text-lg" />
                            <InputOTPSlot index={4} className="w-12 h-12 text-lg" />
                            <InputOTPSlot index={5} className="w-12 h-12 text-lg" />
                        </InputOTPGroup>
                    </InputOTP>
                    <Button className="w-full h-12 text-lg">Verify</Button>
                </div>
            </CardContent>
        </Card>
    )
}
