export default function TablaGrupo({ titulo, equipos }) {
  return (
    <div style={{ marginTop: "20px" }}>
      <h2>{titulo}</h2>

      <table border="1">
        <thead>
          <tr>
            <th>Equipo</th>
            <th>PJ</th>
            <th>Pts</th>
          </tr>
        </thead>

        <tbody>
          {equipos.map((equipo) => (
            <tr key={equipo}>
              <td>{equipo}</td>
              <td>0</td>
              <td>0</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}