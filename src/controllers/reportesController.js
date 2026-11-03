import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

function condicionesFecha(desde, hasta) {
  const condiciones = [];
  const valores = [];
  if (desde) {
    condiciones.push("t.fecha >= ?");
    valores.push(desde);
  }
  if (hasta) {
    condiciones.push("t.fecha <= ?");
    valores.push(hasta);
  }
  return { condiciones, valores };
}

// GET /reportes?desde=&hasta=
// Devuelve los 4 indicadores juntos para que el dashboard se actualice de una sola vez.
export async function obtenerReportes(req, res) {
  try {
    const { desde, hasta } = req.query;
    const { condiciones, valores } = condicionesFecha(desde, hasta);
    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [turnosPorEspecialidad] = await pool.query(
      `SELECT a.id_especialidad, e.descripcion, COUNT(*) AS cantidad
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       JOIN especialidad e ON e.id = a.id_especialidad
       ${where}
       GROUP BY a.id_especialidad, e.descripcion
       ORDER BY cantidad DESC`,
      valores
    );

    const [turnosPorSede] = await pool.query(
      `SELECT a.id_sede, s.nombre, COUNT(*) AS cantidad
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       JOIN sede s ON s.id = a.id_sede
       ${where}
       GROUP BY a.id_sede, s.nombre
       ORDER BY cantidad DESC`,
      valores
    );

    const condicionAtendido = [...condiciones, "t.estado = 'atendido'"].join(" AND ");
    const [rankingMedicos] = await pool.query(
      `SELECT a.id_medico, u.nombre, u.apellido, COUNT(*) AS cantidad
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       JOIN usuario u ON u.id = a.id_medico
       WHERE ${condicionAtendido}
       GROUP BY a.id_medico, u.nombre, u.apellido
       ORDER BY cantidad DESC`,
      valores
    );

    const [[fila]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN t.estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados
       FROM turno t
       ${where}`,
      valores
    );
    const total = Number(fila.total);
    const cancelados = Number(fila.cancelados) || 0;
    const porcentaje = total > 0 ? Number(((cancelados / total) * 100).toFixed(1)) : 0;

    return respuestaOk(res, 200, {
      turnosPorEspecialidad,
      turnosPorSede,
      rankingMedicos,
      tasaCancelacion: { total, cancelados, porcentaje },
    });
  } catch (error) {
    console.error("Error al obtener reportes:", error);
    return respuestaError(res, 500, "Error al obtener los reportes");
  }
}
