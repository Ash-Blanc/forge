import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <main className="min-h-[100dvh] bg-bg flex items-center justify-center p-6">
            <SignUp path="/sign-up" forceRedirectUrl="/dashboard" signInUrl="/sign-in" />
        </main>
    );
}
