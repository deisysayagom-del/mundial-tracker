import Header from "../components/Header";
import TablaGrupo from "../components/TablaGrupo";
import PartidoCard from "../components/PartidoCard";

import { grupos } from "../data/grupos";
import { partidosIniciales } from "../data/partidos";

export default function Home() {
  return (
    <div>
      <Header />

      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px",
        }}
      >
        <h2>⚽ Partidos registrados</h2>

        {partidosIniciales.map((partido, index) => (
          <PartidoCard
            key={index}
            equipo1={partido.equipo1}
            equipo2={partido.equipo2}
            goles1={partido.goles1}
            goles2={partido.goles2}
          />
        ))}

        <hr style={{ margin: "30px 0" }} />

        <h2>🏆 Grupos del Mundial 2026</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {Object.entries(grupos).map(([letra, equipos]) => (
            <TablaGrupo
              key={letra}
              titulo={`Grupo ${letra}`}
              equipos={equipos}
            />
          ))}
        </div>
      </main>
    </div>
  );
}