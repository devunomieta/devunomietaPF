import { NewsletterForm } from "./NewsletterForm";

export function NewsletterSection() {
  return (
    <section className="mt-12 pt-12 border-t border-border/50">
      <div className="max-w-md mx-auto">
        <NewsletterForm />
      </div>
    </section>
  );
}
