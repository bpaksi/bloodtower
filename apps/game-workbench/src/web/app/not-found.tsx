import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-head">
      <h1>No such document</h1>
      <p className="muted">
        <Link href="/">Back to the design document</Link>
      </p>
    </section>
  );
}
