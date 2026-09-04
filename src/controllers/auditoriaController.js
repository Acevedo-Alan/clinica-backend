import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

// GET /auditoria
// Consulta de logs de auditoría. Solo administrador.
// Filtros opcionales por query: id_usuario, entidad, fecha_desde, fecha_hasta
export async function listarAuditoria(req, res) {
  try {
    const { id_usuario, entidad, fecha_desde, fecha_hasta } = req.query;

    const condiciones = [];
    const valores = [];

    if (id_usuario) {
      condiciones.push("l.id_usuario = ?");
      valores.push(id_usuario);
    }
    if (entidad) {
      condiciones.push("l.entidad = ?");
      valores.push(entidad);
    }
    if (fecha_desde) {
      condiciones.push("l.fecha >= ?");
      valores.push(`${fecha_desde} 00:00:00`);
    }
    if (fecha_hasta) {
      condiciones.push("l.fecha <= ?");
      valores.push(`${fecha_hasta} 23:59:59`);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT l.id, l.id_usuario, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
              l.accion, l.entidad, l.id_entidad, l.detalle, l.fecha
       FROM log_auditoria l
       LEFT JOIN usuario u ON u.id = l.id_usuario
       ${where}
       ORDER BY l.fecha DESC, l.id DESC`,
      valores
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar la auditoría:", error);
    return respuestaError(res, 500, "Error al obtener los registros de auditoría");
  }
}
