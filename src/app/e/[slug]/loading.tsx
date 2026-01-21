export default function EventPageLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Hero skeleton */}
      <div className="h-[60vh] bg-muted" />

      {/* Content skeleton */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="h-8 bg-muted rounded w-2/3 mx-auto mb-4" />
        <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-12" />

        {/* Details section skeleton */}
        <div className="space-y-6">
          <div className="h-6 bg-muted rounded w-1/4 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
