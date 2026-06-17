export default function PartidoCard({
  equipo1,
  equipo2,
  goles1,
  goles2,
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: "10px",
        marginBottom: "10px",
        borderRadius: "8px",
        background: "white",
      }}
    >
      <strong>{equipo1}</strong> {goles1} - {goles2}{" "}
      <strong>{equipo2}</strong>
    </div>
  );
}