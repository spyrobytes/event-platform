import Link from "next/link";

export default function GalleryNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Gallery not available
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This event doesn&apos;t have a published photo gallery yet.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
