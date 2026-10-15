import { PROTOCOL_VERSION } from "bloodtower-protocols";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-4xl leading-tight">Bloodtower</h1>
      <p className="max-w-xl text-lg leading-relaxed">Story board. Display only.</p>
      <p className="max-w-xl leading-relaxed">
        Protocol {PROTOCOL_VERSION}. Tower connection is not open. This build sends no effects.
      </p>
    </main>
  );
}
