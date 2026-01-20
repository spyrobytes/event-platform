import Link from "next/link";

export default function EventNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Event Not Found
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          The event page you&apos;re looking for doesn&apos;t exist or hasn&apos;t been
          published yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
