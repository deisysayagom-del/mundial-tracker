import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function MundialTracker() {
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [equipo1, setEquipo1] = useState('');
  const [equipo2, setEquipo2] = useState('');
  const [goles1, setGoles1] = useState('');
  const [goles2, setGoles2] = useState('');
  const [grupo, setGrupo] = useState('A');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarDatos();

    const subscription = supabase
      .channel('partidos_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
        cargarDatos();
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  const cargarDatos = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('partidos')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPartidos(data || []);
      calcularEstadisticas(data || []);
      setError('');
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar datos: ' + err.message);
    }
  };

  const calcularEstadisticas = (todosPartidos) => {
    const stats = {};

    todosPartidos.forEach(partido => {
      const { equipo1, equipo2, goles1, goles2, grupo } = partido;
      const key1 = `${equipo1}-${grupo}`;
      const key2 = `${equipo2}-${grupo}`;

      if (!stats[key1]) {
        stats[key1] = { nombre: equipo1, grupo, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 };
      }
      if (!stats[key2]) {
        stats[key2] = { nombre: equipo2, grupo, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 };
      }

      const eq1 = stats[key1];
      const eq2 = stats[key2];

      eq1.pj += 1;
      eq2.pj += 1;
      eq1.gf += goles1;
      eq1.gc += goles2;
      eq2.gf += goles2;
      eq2.gc += goles1;

      if (goles1 > goles2) {
        eq1.g += 1;
        eq2.p += 1;
      } else if (goles2 > goles1) {
        eq2.g += 1;
        eq1.p += 1;
      } else {
        eq1.e += 1;
        eq2.e += 1;
      }
    });

    setEquipos(Object.values(stats));
  };

  const agregarPartido = async () => {
    if (!equipo1 || !equipo2 || goles1 === '' || goles2 === '') {
      setError('Por favor completa todos los campos');
      return;
    }

    if (equipo1.toLowerCase() === equipo2.toLowerCase()) {
      setError('Los equipos no pueden ser iguales');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('partidos').insert([
        {
          grupo,
          equipo1: equipo1.trim(),
          equipo2: equipo2.trim(),
          goles1: parseInt(goles1),
          goles2: parseInt(goles2),
        },
      ]);

      if (insertError) throw insertError;

      setEquipo1('');
      setEquipo2('');
      setGoles1('');
      setGoles2('');
      await cargarDatos();
    } catch (err) {
      setError('Error al registrar: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  const borrarPartido = async (id) => {
    if (!confirm('¿Eliminar este partido?')) return;

    try {
      const { error: deleteError } = await supabase.from('partidos').delete().eq('id', id);
      if (deleteError) throw deleteError;
      await cargarDatos();
    } catch (err) {
      setError('Error al eliminar: ' + err.message);
    }
  };

  const limpiarTodo = async () => {
    if (!confirm('¿Borrar TODOS los partidos? ⚠️ No se puede deshacer.')) return;

    try {
      const { error: deleteError } = await supabase.from('partidos').delete().neq('id', 0);
      if (deleteError) throw deleteError;
      setEquipos([]);
      setPartidos([]);
      setError('');
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const calcularPuntos = (equipo) => equipo.g * 3 + equipo.e;
  const calcularDG = (equipo) => equipo.gf - equipo.gc;

  const equiposPorGrupo = {};
  equipos.forEach(eq => {
    if (!equiposPorGrupo[eq.grupo]) {
      equiposPorGrupo[eq.grupo] = [];
    }
    equiposPorGrupo[eq.grupo].push(eq);
  });

  Object.keys(equiposPorGrupo).forEach(g => {
    equiposPorGrupo[g].sort((a, b) => {
      const ptosA = calcularPuntos(a);
      const ptosB = calcularPuntos(b);
      if (ptosA !== ptosB) return ptosB - ptosA;
      return calcularDG(b) - calcularDG(a);
    });
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ padding: '2rem 1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>⚽ Tracker del Mundial</h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>Registra partidos y sigue las posiciones en tiempo real</p>
        </div>

        <div style={{ padding: '2rem 1rem' }}>
          {/* Formulario */}
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '20px', fontWeight: 600 }}>Registrar nuevo partido</h2>

            {error && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '1rem', fontSize: '14px' }}>
                ❌ {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Grupo</label>
                <select
                  value={grupo}
                  onChange={(e) => setGrupo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(g => (
                    <option key={g} value={g}>Grupo {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Equipo 1</label>
                <input
                  type="text"
                  placeholder="Ej: Argentina"
                  value={equipo1}
                  onChange={(e) => setEquipo1(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agregarPartido()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Goles</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={goles1}
                  onChange={(e) => setGoles1(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <span style={{ fontWeight: 700, color: '#6b7280', fontSize: '16px' }}>VS</span>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Goles</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={goles2}
                  onChange={(e) => setGoles2(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Equipo 2</label>
                <input
                  type="text"
                  placeholder="Ej: Brasil"
                  value={equipo2}
                  onChange={(e) => setEquipo2(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agregarPartido()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={agregarPartido}
                disabled={cargando}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: cargando ? '#9ca3af' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: cargando ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {cargando ? '⏳ Guardando...' : '✅ Registrar partido'}
              </button>
              {equipos.length > 0 && (
                <button
                  onClick={limpiarTodo}
                  style={{
                    padding: '12px 20px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  🗑️ Borrar todo
                </button>
              )}
            </div>
          </div>

          {/* Tablas de posiciones */}
          {Object.keys(equiposPorGrupo).length === 0 ? (
            <div style={{
              background: 'white',
              padding: '3rem 2rem',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#9ca3af',
            }}>
              <p style={{ fontSize: '18px', margin: 0 }}>📋 Registra tu primer partido para ver las posiciones</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {Object.keys(equiposPorGrupo).sort().map(grupo => (
                <div key={grupo} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: 600, color: '#667eea' }}>Grupo {grupo}</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, fontSize: '12px' }}>Equipo</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>PJ</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>G</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>E</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>P</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>GF</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>GC</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>DG</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equiposPorGrupo[grupo].map((eq, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx === 0 || idx === 1 ? '#f0f9ff' : 'white' }}>
                            <td style={{ padding: '8px', fontWeight: 500 }}>{eq.nombre}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{eq.pj}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{eq.g}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{eq.e}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{eq.p}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{eq.gf}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{eq.gc}</td>
                            <td style={{
                              padding: '8px',
                              textAlign: 'center',
                              color: calcularDG(eq) > 0 ? '#16a34a' : '#6b7280',
                              fontWeight: 500
                            }}>
                              {calcularDG(eq) > 0 ? '+' : ''}{calcularDG(eq)}
                            </td>
                            <td style={{
                              padding: '8px',
                              textAlign: 'center',
                              fontWeight: 700,
                              background: '#667eea',
                              color: 'white',
                              borderRadius: '4px'
                            }}>
                              {calcularPuntos(eq)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Últimos partidos */}
          {partidos.length > 0 && (
            <div style={{ marginTop: '2rem', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '18px', fontWeight: 600 }}>📅 Últimos partidos</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {partidos.slice(0, 15).map(partido => (
                  <div
                    key={partido.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                    }}
                  >
                    <span>
                      <strong style={{ color: '#667eea' }}>G{partido.grupo}:</strong> {partido.equipo1}{' '}
                      <strong style={{ color: '#16a34a' }}>{partido.goles1}</strong> -{' '}
                      <strong style={{ color: '#16a34a' }}>{partido.goles2}</strong> {partido.equipo2}
                    </span>
                    <button
                      onClick={() => borrarPartido(partido.id)}
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      ✕ Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        button:hover {
          opacity: 0.9;
        }
        input, select {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
    </div>
  );
}
