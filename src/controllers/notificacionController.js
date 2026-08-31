import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

// Helper interno reutilizado por turnoController para generar notificaciones
// de confirmación/cancelación/atención de turnos. No se expone como endpoint público.
export async function crearNotificacion(id_usuario, tipo, mensaje) {
  await pool.query(
    "INSERT INTO notificacion (id_usuario, tipo, mensaje, leida) VALUES (?, ?, ?, 0)",
    [id_usuario, tipo, mensaje]
  );
}

// GET /notificaciones - las del usuario autenticado, de más reciente a más antigua
export async function listarNotificaciones(req, res) {
  try {
    const { id } = req.usuario;

    const [rows] = await pool.query(
      "SELECT id, id_usuario, tipo, mensaje, leida, fecha FROM notificacion WHERE id_usuario = ? ORDER BY fecha DESC",
      [id]
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar notificaciones:", error);
    return respuestaError(res, 500, "Error al obtener las notificaciones");
  }
}

// PUT /notificaciones/:id/leida
export async function marcarLeida(req, res) {
  try {
    const { id } = req.params;
    const { id: idUsuario } = req.usuario;

    const [notificaciones] = await pool.query(
      "SELECT id, id_usuario FROM notificacion WHERE id = ?",
      [id]
    );

    if (notificaciones.length === 0) {
      return respuestaError(res, 404, "La notificación no existe");
    }

    if (Number(notificaciones[0].id_usuario) !== Number(idUsuario)) {
      return respuestaError(res, 403, "No tiene permisos para modificar esta notificación");
    }

    await pool.query("UPDATE notificacion SET leida = 1 WHERE id = ?", [id]);

    return respuestaOk(res, 200, { id: Number(id), leida: true });
  } catch (error) {
    console.error("Error al marcar la notificación como leída:", error);
    return respuestaError(res, 500, "Error al marcar la notificación como leída");
  }
}
