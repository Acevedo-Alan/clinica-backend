import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

// POST /historial - solo el médico que atendió el turno, y solo si ya está 'atendido'
export async function crearHistorial(req, res) {
  try {
    const { id_turno, diagnostico, tratamiento, observaciones } = req.body;

    if (!id_turno || !diagnostico) {
      return respuestaError(res, 400, "Faltan datos obligatorios: id_turno, diagnostico");
    }

    const { id: idMedico } = req.usuario;

    const [turnos] = await pool.query(
      `SELECT t.id, t.estado, t.id_paciente, a.id_medico
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       WHERE t.id = ?`,
      [id_turno]
    );
    if (turnos.length === 0) {
      return respuestaError(res, 404, "El turno no existe");
    }
    const turno = turnos[0];

    if (Number(turno.id_medico) !== Number(idMedico)) {
      return respuestaError(
        res,
        403,
        "Solo puede cargar historial de turnos atendidos por usted"
      );
    }

    if (turno.estado !== "atendido") {
      return respuestaError(
        res,
        400,
        "El turno debe estar en estado 'atendido' para cargar el historial"
      );
    }

    const [resultado] = await pool.query(
      `INSERT INTO historial_clinico (id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_turno, idMedico, turno.id_paciente, diagnostico, tratamiento || null, observaciones || null]
    );

    return respuestaOk(res, 201, {
      id: resultado.insertId,
      id_turno: Number(id_turno),
      id_medico: idMedico,
      id_paciente: turno.id_paciente,
      diagnostico,
      tratamiento: tratamiento || null,
      observaciones: observaciones || null,
    });
  } catch (error) {
    console.error("Error al crear el historial clínico:", error);
    return respuestaError(res, 500, "Error al crear el historial clínico");
  }
}

// GET /historial/paciente/:id_paciente
// - paciente: solo el propio
// - medico: solo los registros que él mismo cargó
export async function listarHistorialPaciente(req, res) {
  try {
    const { id_paciente } = req.params;
    const { rol, id } = req.usuario;

    if (rol === "paciente") {
      if (Number(id_paciente) !== Number(id)) {
        return respuestaError(res, 403, "Un paciente solo puede consultar su propio historial");
      }

      const [rows] = await pool.query(
        `SELECT id, id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones, fecha_registro
         FROM historial_clinico WHERE id_paciente = ? ORDER BY fecha_registro DESC`,
        [id_paciente]
      );
      return respuestaOk(res, 200, rows);
    }

    // rol === "medico" (único otro rol permitido por la ruta)
    const [rows] = await pool.query(
      `SELECT id, id_turno, id_medico, id_paciente, diagnostico, tratamiento, observaciones, fecha_registro
       FROM historial_clinico WHERE id_paciente = ? AND id_medico = ? ORDER BY fecha_registro DESC`,
      [id_paciente, id]
    );
    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar el historial clínico:", error);
    return respuestaError(res, 500, "Error al obtener el historial clínico");
  }
}
