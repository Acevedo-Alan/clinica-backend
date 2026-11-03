import pool from "../database/db.js";

// Registra una acción sensible (ALTA / BAJA / MODIFICACION) en log_auditoria.
// Es un efecto secundario: si falla, no debe tirar abajo la operación principal.
export async function registrarAuditoria(idUsuario, accion, entidad, idEntidad, detalle) {
  try {
    await pool.query(
      "INSERT INTO log_auditoria (id_usuario, accion, entidad, id_entidad, detalle) VALUES (?, ?, ?, ?, ?)",
      [idUsuario, accion, entidad, idEntidad ?? null, detalle ?? null]
    );
  } catch (error) {
    console.error("Error al registrar auditoría:", error);
  }
}
