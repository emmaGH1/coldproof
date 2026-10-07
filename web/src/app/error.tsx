"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="flex min-h-dvh flex-col justify-center gap-6 px-8">
    <h1 className="text-4xl font-semibold">Evidence service unavailable</h1>
    <p className="text-muted-foreground">No verification result is being claimed. Check the local database and Hornet stack, then retry.</p>
    <button onClick={reset} className="w-fit border border-ice px-6 py-3 text-ice">Retry</button>
  </main>;
}
