import Link from "next/link";
import { verifyEmail } from "@/lib/verification";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function VerifyEmailTokenPage({ params }: PageProps) {
  const { token } = await params;

  let error: string | null = null;
  let success = false;

  try {
    await verifyEmail(token);
    success = true;
  } catch (e) {
    error = e instanceof Error ? e.message : "Verification failed";
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <svg
                className="h-8 w-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <CardTitle>Email Verified!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your email has been verified. You can now access all features.
            </p>
            <Link
              href="/dashboard"
              className={cn(
                "inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
                "bg-accent text-accent-foreground hover:bg-accent/90",
                "transition-all duration-150 hover:shadow-sm"
              )}
            >
              Go to Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <CardTitle>Verification Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{error}</p>
          <Link
            href="/login"
            className={cn(
              "inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
              "border border-border bg-transparent text-foreground hover:bg-surface-2",
              "transition-all duration-150 hover:shadow-sm"
            )}
          >
            Go to Login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
