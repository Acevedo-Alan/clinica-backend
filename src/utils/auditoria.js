import pool from "../database/db.js";

/**
 * Registra una entrada en log_auditoria.
 * Se llama desde los controllers que realizan ALTA / BAJA / MODIFICACION.
 *
 * @param {number}  id_usuario  - ID del usuario que realizó la acción (req.usuario.id)
 * @param {string}  accion      - 'ALTA' | 'BAJA' | 'MODIFICACION'
 * @param {string}  entidad     - nombre de la tabla afectada (ej: 'usuario', 'sede')
 * @param {number}  id_entidad  - ID del registro afectado
 * @param {string}  detalle     - descripción legible de la acción
 */
export async function registrarAuditoria(id_usuario, accion, entidad, id_entidad, detalle) {
  try {
    await pool.query(
      "INSERT INTO log_auditoria (id_usuario, accion, entidad, id_entidad, detalle) VALUES (?, ?, ?, ?, ?)",
      [id_usuario, accion, entidad, id_entidad, detalle]
    );
  } catch (error) {
    // No se lanza para no interrumpir la operación principal.
    // Se loguea para poder investigar si algo falla con la auditoría.
    console.error("Error al registrar auditoría:", error);
  }
}
