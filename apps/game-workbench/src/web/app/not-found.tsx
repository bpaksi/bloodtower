import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <p className="kicker">Not found</p>
      <h1>No such document</h1>
      <p className="lede">
        <Link href="/">Back to the design document</Link>
      </p>
    </section>
  );
}
