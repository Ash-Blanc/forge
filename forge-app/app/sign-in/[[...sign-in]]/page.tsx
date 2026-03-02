import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <main className="min-h-[100dvh] bg-bg flex items-center justify-center p-6">
            <SignIn path="/sign-in" forceRedirectUrl="/dashboard" signUpUrl="/sign-up" />
        </main>
    );
}
