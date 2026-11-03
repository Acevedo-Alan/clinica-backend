import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";
import { parsePaginacion, datosPaginados } from "../utils/paginacion.js";

const CAMPOS_AUDITORIA = `
  l.id, l.id_usuario, u.nombre AS nombre_usuario, u.apellido AS apellido_usuario,
  l.accion, l.entidad, l.id_entidad, l.detalle, l.fecha
`;

// GET /auditoria?usuario=&entidad=&desde=&hasta=&page=&pageSize=
// "usuario" busca por nombre o apellido (el admin no tiene por qué saber el id).
export async function listarAuditoria(req, res) {
  try {
    const { usuario, entidad, desde, hasta } = req.query;
    const { page, pageSize, offset } = parsePaginacion(req.query);

    const condiciones = [];
    const valores = [];
    if (usuario) {
      condiciones.push("(u.nombre LIKE ? OR u.apellido LIKE ?)");
      valores.push(`%${usuario}%`, `%${usuario}%`);
    }
    if (entidad) {
      condiciones.push("l.entidad = ?");
      valores.push(entidad);
    }
    if (desde) {
      condiciones.push("l.fecha >= ?");
      valores.push(`${desde} 00:00:00`);
    }
    if (hasta) {
      condiciones.push("l.fecha <= ?");
      valores.push(`${hasta} 23:59:59`);
    }
    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM log_auditoria l
       LEFT JOIN usuario u ON u.id = l.id_usuario
       ${where}`,
      valores
    );

    const [filas] = await pool.query(
      `SELECT ${CAMPOS_AUDITORIA}
       FROM log_auditoria l
       LEFT JOIN usuario u ON u.id = l.id_usuario
       ${where}
       ORDER BY l.fecha DESC
       LIMIT ? OFFSET ?`,
      [...valores, pageSize, offset]
    );

    return respuestaOk(res, 200, datosPaginados(filas, total, page, pageSize));
  } catch (error) {
    console.error("Error al listar auditoría:", error);
    return respuestaError(res, 500, "Error al obtener la auditoría");
  }
}
