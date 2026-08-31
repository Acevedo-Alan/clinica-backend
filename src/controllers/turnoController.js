import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";
import { crearNotificacion } from "./notificacionController.js";

// Formatea una fecha (Date o string) como dd/mm/yyyy para los mensajes de notificación
function formatearFecha(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// POST /turnos
// El turno se crea a partir de un id_agenda concreto (ya elegido por el paciente/operador
// vía GET /agenda), lo que evita ambigüedad cuando un médico tiene varios rangos horarios
// el mismo día. La fecha y la validación de horario salen siempre de esa agenda.
export async function crearTurno(req, res) {
  try {
    const { id_agenda, hora, nota } = req.body;
    let { id_paciente } = req.body;

    if (!id_agenda || !hora || !nota) {
      return respuestaError(res, 400, "Faltan datos obligatorios: id_agenda, hora, nota");
    }

    const { rol, id } = req.usuario;

    if (rol === "paciente") {
      id_paciente = id;
    } else if (rol === "operador") {
      if (!id_paciente) {
        return respuestaError(res, 400, "Debe indicar id_paciente");
      }
      const [pacientes] = await pool.query(
        "SELECT id FROM usuario WHERE id = ? AND rol = 'paciente'",
        [id_paciente]
      );
      if (pacientes.length === 0) {
        return respuestaError(res, 400, "El paciente indicado no existe");
      }
    }

    const [agendas] = await pool.query("SELECT * FROM agenda WHERE id = ?", [id_agenda]);
    if (agendas.length === 0) {
      return respuestaError(res, 400, "La agenda indicada no existe");
    }
    const agenda = agendas[0];

    if (!(hora >= agenda.hora_entrada && hora < agenda.hora_salida)) {
      return respuestaError(
        res,
        400,
        "El horario solicitado no está disponible en la agenda del médico"
      );
    }

    const [turnosExistentes] = await pool.query(
      `SELECT id FROM turno
       WHERE id_agenda = ? AND fecha = ? AND hora = ? AND estado = 'confirmado'
       LIMIT 1`,
      [id_agenda, agenda.fecha, hora]
    );
    if (turnosExistentes.length > 0) {
      return respuestaError(res, 409, "Ya existe un turno confirmado para ese horario");
    }

    // El id_cobertura del turno sale siempre de la cobertura del paciente en la base,
    // nunca de lo que venga en el body.
    const [pacienteRows] = await pool.query(
      "SELECT id_cobertura FROM usuario WHERE id = ?",
      [id_paciente]
    );
    const idCobertura = pacienteRows[0]?.id_cobertura;
    if (!idCobertura) {
      return respuestaError(res, 400, "El paciente no tiene una cobertura asignada");
    }

    const [resultado] = await pool.query(
      `INSERT INTO turno (nota, id_agenda, fecha, hora, id_paciente, id_cobertura, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmado')`,
      [nota, id_agenda, agenda.fecha, hora, id_paciente, idCobertura]
    );

    await crearNotificacion(
      id_paciente,
      "turno_confirmado",
      `Tu turno del ${formatearFecha(agenda.fecha)} a las ${hora} fue confirmado.`
    );

    return respuestaOk(res, 201, {
      id: resultado.insertId,
      nota,
      id_agenda: Number(id_agenda),
      fecha: agenda.fecha,
      hora,
      id_paciente: Number(id_paciente),
      id_cobertura: idCobertura,
      estado: "confirmado",
    });
  } catch (error) {
    console.error("Error al crear el turno:", error);
    return respuestaError(res, 500, "Error al crear el turno");
  }
}

// PUT /turnos/:id/cancelar
export async function cancelarTurno(req, res) {
  try {
    const { id } = req.params;
    const { rol, id: idUsuario, id_sede: sedeToken } = req.usuario;

    const [turnos] = await pool.query(
      `SELECT t.*, a.id_medico, a.id_sede
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       WHERE t.id = ?`,
      [id]
    );
    if (turnos.length === 0) {
      return respuestaError(res, 404, "El turno no existe");
    }
    const turno = turnos[0];

    if (rol === "paciente" && Number(turno.id_paciente) !== Number(idUsuario)) {
      return respuestaError(res, 403, "Un paciente solo puede cancelar sus propios turnos");
    }

    if (
      (rol === "operador" || rol === "medico") &&
      Number(turno.id_sede) !== Number(sedeToken)
    ) {
      return respuestaError(res, 403, "No tiene permisos para cancelar turnos de otra sede");
    }

    if (turno.estado !== "confirmado") {
      return respuestaError(
        res,
        409,
        `El turno ya se encuentra en estado '${turno.estado}', no se puede cancelar`
      );
    }

    await pool.query("UPDATE turno SET estado = 'cancelado' WHERE id = ?", [id]);

    await crearNotificacion(
      turno.id_paciente,
      "turno_cancelado",
      `Tu turno del ${formatearFecha(turno.fecha)} a las ${turno.hora} fue cancelado.`
    );

    return respuestaOk(res, 200, { id: Number(id), estado: "cancelado" });
  } catch (error) {
    console.error("Error al cancelar el turno:", error);
    return respuestaError(res, 500, "Error al cancelar el turno");
  }
}

// PUT /turnos/:id/atender
// La carga del historial clínico queda como paso posterior separado (POST /historial),
// asociado a este turno mediante id_turno; no se crea automáticamente acá.
export async function atenderTurno(req, res) {
  try {
    const { id } = req.params;
    const { id: idUsuario } = req.usuario;

    const [turnos] = await pool.query(
      `SELECT t.*, a.id_medico
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       WHERE t.id = ?`,
      [id]
    );
    if (turnos.length === 0) {
      return respuestaError(res, 404, "El turno no existe");
    }
    const turno = turnos[0];

    if (Number(turno.id_medico) !== Number(idUsuario)) {
      return respuestaError(res, 403, "Un médico solo puede atender turnos de su propia agenda");
    }

    if (turno.estado !== "confirmado") {
      return respuestaError(
        res,
        409,
        `El turno ya se encuentra en estado '${turno.estado}', no se puede atender`
      );
    }

    await pool.query("UPDATE turno SET estado = 'atendido' WHERE id = ?", [id]);

    await crearNotificacion(
      turno.id_paciente,
      "turno_atendido",
      `Tu turno del ${formatearFecha(turno.fecha)} a las ${turno.hora} fue atendido.`
    );

    return respuestaOk(res, 200, { id: Number(id), estado: "atendido" });
  } catch (error) {
    console.error("Error al atender el turno:", error);
    return respuestaError(res, 500, "Error al atender el turno");
  }
}

// GET /turnos/mios - turnos del paciente autenticado, del más próximo al más lejano
export async function misTurnos(req, res) {
  try {
    const { id } = req.usuario;

    const [rows] = await pool.query(
      `SELECT id, nota, id_agenda, fecha, hora, id_paciente, id_cobertura, estado
       FROM turno WHERE id_paciente = ? ORDER BY fecha ASC, hora ASC`,
      [id]
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar mis turnos:", error);
    return respuestaError(res, 500, "Error al obtener los turnos");
  }
}

// GET /turnos/medico?fecha= - turnos del médico autenticado para esa fecha
export async function turnosMedico(req, res) {
  try {
    const { id } = req.usuario;
    const { fecha } = req.query;

    if (!fecha) {
      return respuestaError(res, 400, "Debe indicar la fecha a consultar");
    }

    const [rows] = await pool.query(
      `SELECT t.id, t.nota, t.id_agenda, t.fecha, t.hora, t.id_paciente, t.id_cobertura, t.estado
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       WHERE a.id_medico = ? AND t.fecha = ?
       ORDER BY t.hora ASC`,
      [id, fecha]
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar los turnos del médico:", error);
    return respuestaError(res, 500, "Error al obtener los turnos");
  }
}

// GET /turnos/sede?fecha= - turnos de la sede del operador autenticado para esa fecha
export async function turnosSede(req, res) {
  try {
    const { id_sede } = req.usuario;
    const { fecha } = req.query;

    if (!fecha) {
      return respuestaError(res, 400, "Debe indicar la fecha a consultar");
    }

    const [rows] = await pool.query(
      `SELECT t.id, t.nota, t.id_agenda, t.fecha, t.hora, t.id_paciente, t.id_cobertura, t.estado
       FROM turno t
       JOIN agenda a ON a.id = t.id_agenda
       WHERE a.id_sede = ? AND t.fecha = ?
       ORDER BY t.hora ASC`,
      [id_sede, fecha]
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar los turnos de la sede:", error);
    return respuestaError(res, 500, "Error al obtener los turnos");
  }
}
