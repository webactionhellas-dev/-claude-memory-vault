import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-6 py-32 text-center">
      <div>
        <p className="font-serif text-7xl font-semibold text-primary">404</p>
        <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">
          Η σελίδα δεν βρέθηκε
        </h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Λυπούμαστε, η σελίδα που ψάχνετε δεν υπάρχει. / Sorry, this page doesn&apos;t exist.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">Επιστροφή στην αρχική · Back home</Link>
        </Button>
      </div>
    </section>
  );
}
