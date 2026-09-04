import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

// Construye el filtro común por rango de fechas sobre t.fecha
function filtroFechas(fechaDesde, fechaHasta) {
  const condiciones = [];
  const valores = [];

  if (fechaDesde) {
    condiciones.push("t.fecha >= ?");
    valores.push(fechaDesde);
  }
  if (fechaHasta) {
    condiciones.push("t.fecha <= ?");
    valores.push(fechaHasta);
  }

  return { condiciones, valores };
}

// GET /reportes/turnos-por-especialidad
// Cantidad de turnos por especialidad, opcionalmente filtrado por rango de fechas
export async function turnosPorEspecialidad(req, res) {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    const { condiciones, valores } = filtroFechas(fecha_desde, fecha_hasta);

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT e.id, e.descripcion AS especialidad, COUNT(t.id) AS total_turnos
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       JOIN especialidad e ON e.id = a.id_especialidad
       ${where}
       GROUP BY e.id, e.descripcion
       ORDER BY total_turnos DESC`,
      valores
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error en reporte de turnos por especialidad:", error);
    return respuestaError(res, 500, "Error al generar el reporte de turnos por especialidad");
  }
}

// GET /reportes/turnos-por-sede
// Cantidad de turnos por sede, opcionalmente filtrado por rango de fechas
export async function turnosPorSede(req, res) {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    const { condiciones, valores } = filtroFechas(fecha_desde, fecha_hasta);

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT s.id, s.nombre AS sede, COUNT(t.id) AS total_turnos
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       JOIN sede s ON s.id = a.id_sede
       ${where}
       GROUP BY s.id, s.nombre
       ORDER BY total_turnos DESC`,
      valores
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error en reporte de turnos por sede:", error);
    return respuestaError(res, 500, "Error al generar el reporte de turnos por sede");
  }
}

// GET /reportes/ranking-medicos?limite=
// Ranking de médicos por cantidad de turnos atendidos (todos, no solo el primero).
// El parámetro opcional `limite` permite acotar el top N.
export async function rankingMedicos(req, res) {
  try {
    const { limite, fecha_desde, fecha_hasta } = req.query;
    const { condiciones, valores } = filtroFechas(fecha_desde, fecha_hasta);

    condiciones.push("t.estado = 'atendido'");
    const where = `WHERE ${condiciones.join(" AND ")}`;

    let order = ` ORDER BY turnos_atendidos DESC, u.apellido ASC`;
    if (limite && !isNaN(Number(limite))) {
      order += ` LIMIT ${Number(limite)}`;
    }

    const [rows] = await pool.query(
      `SELECT u.id AS id_medico, u.nombre, u.apellido,
              COUNT(t.id) AS turnos_atendidos
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       JOIN usuario u ON u.id = a.id_medico
       ${where}
       GROUP BY u.id, u.nombre, u.apellido
       ${order}`,
      valores
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error en ranking de médicos:", error);
    return respuestaError(res, 500, "Error al generar el ranking de médicos");
  }
}

// GET /reportes/tasa-cancelacion
// Porcentaje de turnos cancelados sobre el total, opcionalmente filtrado por fechas
export async function tasaCancelacion(req, res) {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    const { condiciones, valores } = filtroFechas(fecha_desde, fecha_hasta);

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT COUNT(t.id) AS total_turnos,
              SUM(CASE WHEN t.estado = 'cancelado' THEN 1 ELSE 0 END) AS turnos_cancelados
       FROM turno t
       ${where}`,
      valores
    );

    const total = Number(rows[0].total_turnos) || 0;
    const cancelados = Number(rows[0].turnos_cancelados) || 0;
    const tasa = total > 0 ? (cancelados / total) * 100 : 0;

    return respuestaOk(res, 200, {
      total_turnos: total,
      turnos_cancelados: cancelados,
      tasa_cancelacion_porcentaje: Number(tasa.toFixed(2)),
    });
  } catch (error) {
    console.error("Error en tasa de cancelación:", error);
    return respuestaError(res, 500, "Error al generar la tasa de cancelación");
  }
}
