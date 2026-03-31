import Image from "next/image"
import { ForgotPasswordForm } from "@/components/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Image
                src="/hay2010-logo.png"
                alt="HAY2010"
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            HAY2010
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-6 lg:bg-gradient-to-br lg:from-primary/20 lg:via-background lg:to-violet-500/20 lg:p-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/30 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-violet-500/20 via-transparent to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="size-24 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/30 mb-6">
            <Image
              src="/hay2010-logo.png"
              alt="HAY2010"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold tracking-tight gradient-text">HAY2010</h2>
          <p className="text-lg text-muted-foreground mt-2 max-w-md">
            Gestion Commerciale Intelligente
          </p>
          <p className="text-sm text-muted-foreground/80 mt-4 max-w-md">
            We'll help you regain access to your account securely.
          </p>
        </div>
      </div>
    </div>
  )
}
