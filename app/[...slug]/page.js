export default async function Placeholder({ params }) {
  const { slug } = await params;
  const title = slug.map((s) => decodeURIComponent(s).replace(/-/g, " ")).join(" / ");
  return (
    <section className="panel placeholder">
      <h2 style={{ textTransform: "capitalize" }}>{title}</h2>
      <p>This page is ready to be built.</p>
    </section>
  );
}
