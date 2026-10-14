import { DOOR_LINE, DOOR_TITLE } from "@/lib/door";

export default function DoorPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-amber-200/80">Dracula pack · Night 2</p>
      <h1 className="text-4xl leading-tight sm:text-5xl">{DOOR_TITLE}</h1>
      <p className="max-w-xl text-lg leading-relaxed text-stone-200">{DOOR_LINE}</p>
      <a href="/dashboard" className="text-lg text-amber-200 underline">
        Open the Dashboard
      </a>
    </main>
  );
}
