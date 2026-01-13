import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RSVPLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="h-64 w-full animate-pulse bg-muted" />

      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Event Info Skeleton */}
        <div className="mb-8 space-y-4 text-center">
          <div className="mx-auto h-10 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mx-auto h-5 w-1/2 animate-pulse rounded bg-muted" />
          <div className="flex justify-center gap-4">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Form Skeleton */}
        <Card className="mx-auto max-w-lg">
          <CardHeader className="space-y-2">
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Response Options Skeleton */}
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted" />
              ))}
            </div>

            {/* Input Fields Skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>

            {/* Button Skeleton */}
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
