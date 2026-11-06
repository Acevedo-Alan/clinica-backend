import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";
import { registrarAuditoria } from "../utils/auditoria.js";

// Valida que médico, especialidad y sede existan antes de insertar/actualizar,
// para no depender del error de foreign key sin controlar.
async function validarReferencias({ id_medico, id_especialidad, id_sede }) {
  const [medicos] = await pool.query(
    "SELECT id FROM usuario WHERE id = ? AND rol = 'medico'",
    [id_medico]
  );
  if (medicos.length === 0) {
    return "El médico indicado no existe";
  }

  const [especialidades] = await pool.query(
    "SELECT id FROM especialidad WHERE id = ?",
    [id_especialidad]
  );
  if (especialidades.length === 0) {
    return "La especialidad indicada no existe";
  }

  const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [
    id_sede,
  ]);
  if (sedes.length === 0) {
    return "La sede indicada no existe";
  }

  return null;
}

// Fecha de hoy como "YYYY-MM-DD" en hora local, para comparar contra el
// "fecha" de la agenda (string tal como viene del body, mismo formato).
function hoyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Un médico no puede tener dos bloques de agenda que se superpongan el mismo día.
// idExcluir se usa en la modificación para no comparar el registro contra sí mismo.
async function existeSuperposicion({ id_medico, fecha, hora_entrada, hora_salida, idExcluir }) {
  const condiciones = ["id_medico = ?", "fecha = ?", "hora_entrada < ?", "hora_salida > ?"];
  const valores = [id_medico, fecha, hora_salida, hora_entrada];

  if (idExcluir) {
    condiciones.push("id <> ?");
    valores.push(idExcluir);
  }

  const [filas] = await pool.query(
    `SELECT id FROM agenda WHERE ${condiciones.join(" AND ")} LIMIT 1`,
    valores
  );
  return filas.length > 0;
}

// POST /agenda
export async function crearAgenda(req, res) {
  try {
    const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } =
      req.body;

    if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
      return respuestaError(
        res,
        400,
        "Faltan datos obligatorios: hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede"
      );
    }

    if (hora_entrada >= hora_salida) {
      return respuestaError(res, 400, "La hora de entrada debe ser anterior a la hora de salida");
    }

    if (fecha < hoyISO()) {
      return respuestaError(res, 400, "No se puede crear un registro de agenda con fecha pasada");
    }

    const { rol, id, id_sede: sedeToken } = req.usuario;

    if (rol === "medico" && Number(id_medico) !== Number(id)) {
      return respuestaError(res, 403, "Un médico solo puede crear su propia agenda");
    }

    if (rol === "operador" && Number(id_sede) !== Number(sedeToken)) {
      return respuestaError(res, 403, "Un operador solo puede crear agenda en su propia sede");
    }

    const errorReferencia = await validarReferencias({ id_medico, id_especialidad, id_sede });
    if (errorReferencia) {
      return respuestaError(res, 400, errorReferencia);
    }

    if (await existeSuperposicion({ id_medico, fecha, hora_entrada, hora_salida })) {
      return respuestaError(
        res,
        409,
        "El médico ya tiene un registro de agenda que se superpone con ese horario"
      );
    }

    const [resultado] = await pool.query(
      `INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede]
    );

    await registrarAuditoria(
      req.usuario.id,
      "ALTA",
      "agenda",
      resultado.insertId,
      `Alta de agenda del médico ${id_medico} el ${fecha} de ${hora_entrada} a ${hora_salida}`
    );

    return respuestaOk(res, 201, {
      id: resultado.insertId,
      hora_entrada,
      hora_salida,
      fecha,
      id_medico: Number(id_medico),
      id_especialidad: Number(id_especialidad),
      id_sede: Number(id_sede),
    });
  } catch (error) {
    console.error("Error al crear la agenda:", error);
    return respuestaError(res, 500, "Error al crear la agenda");
  }
}

// Días máximos que puede abarcar una agenda recurrente (evita altas masivas accidentales).
const MAX_DIAS_RECURRENCIA = 92;

// Devuelve las fechas "YYYY-MM-DD" entre desde y hasta (inclusive) cuyo día de semana
// (1 = lunes ... 7 = domingo) está en diasSemana. Se trabaja en UTC para no depender de la zona horaria.
export function fechasRecurrentes(desde, hasta, diasSemana) {
  const fechas = [];
  const fin = new Date(`${hasta}T00:00:00Z`);
  for (let d = new Date(`${desde}T00:00:00Z`); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
    const diaIso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    if (diasSemana.includes(diaIso)) {
      fechas.push(d.toISOString().slice(0, 10));
    }
  }
  return fechas;
}

// POST /agenda/recurrente
// Crea un bloque de agenda por cada fecha entre fecha_desde y fecha_hasta que caiga en alguno de
// dias_semana (1 = lunes ... 7 = domingo). Las fechas donde el médico ya tiene un bloque que se
// superpone se omiten y se informan en la respuesta; el resto se crea.
export async function crearAgendaRecurrente(req, res) {
  try {
    const {
      hora_entrada,
      hora_salida,
      fecha_desde,
      fecha_hasta,
      dias_semana,
      id_medico,
      id_especialidad,
      id_sede,
    } = req.body;

    if (
      !hora_entrada || !hora_salida || !fecha_desde || !fecha_hasta ||
      !id_medico || !id_especialidad || !id_sede
    ) {
      return respuestaError(
        res,
        400,
        "Faltan datos obligatorios: hora_entrada, hora_salida, fecha_desde, fecha_hasta, dias_semana, id_medico, id_especialidad, id_sede"
      );
    }

    const dias = Array.isArray(dias_semana) ? dias_semana.map(Number) : [];
    if (dias.length === 0 || dias.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
      return respuestaError(res, 400, "dias_semana debe ser una lista de días entre 1 (lunes) y 7 (domingo)");
    }

    if (hora_entrada >= hora_salida) {
      return respuestaError(res, 400, "La hora de entrada debe ser anterior a la hora de salida");
    }

    if (fecha_desde < hoyISO()) {
      return respuestaError(res, 400, "No se puede crear agenda con fecha pasada");
    }

    if (fecha_hasta < fecha_desde) {
      return respuestaError(res, 400, "La fecha hasta no puede ser anterior a la fecha desde");
    }

    const diasRango =
      (new Date(`${fecha_hasta}T00:00:00Z`) - new Date(`${fecha_desde}T00:00:00Z`)) / 86400000 + 1;
    if (diasRango > MAX_DIAS_RECURRENCIA) {
      return respuestaError(res, 400, `El rango no puede superar los ${MAX_DIAS_RECURRENCIA} días`);
    }

    const { rol, id, id_sede: sedeToken } = req.usuario;

    if (rol === "medico" && Number(id_medico) !== Number(id)) {
      return respuestaError(res, 403, "Un médico solo puede crear su propia agenda");
    }

    if (rol === "operador" && Number(id_sede) !== Number(sedeToken)) {
      return respuestaError(res, 403, "Un operador solo puede crear agenda en su propia sede");
    }

    const errorReferencia = await validarReferencias({ id_medico, id_especialidad, id_sede });
    if (errorReferencia) {
      return respuestaError(res, 400, errorReferencia);
    }

    const fechas = fechasRecurrentes(fecha_desde, fecha_hasta, dias);
    if (fechas.length === 0) {
      return respuestaError(res, 400, "Ninguna fecha del rango coincide con los días elegidos");
    }

    const creadas = [];
    const omitidas = [];
    for (const fecha of fechas) {
      if (await existeSuperposicion({ id_medico, fecha, hora_entrada, hora_salida })) {
        omitidas.push({ fecha, motivo: "Ya tiene un registro de agenda que se superpone" });
        continue;
      }
      const [resultado] = await pool.query(
        `INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede]
      );
      creadas.push({ id: resultado.insertId, fecha });
    }

    await registrarAuditoria(
      req.usuario.id,
      "ALTA",
      "agenda",
      creadas.length > 0 ? creadas[0].id : 0,
      `Alta recurrente de agenda del médico ${id_medico} de ${hora_entrada} a ${hora_salida}: ${creadas.length} creadas, ${omitidas.length} omitidas (${fecha_desde} a ${fecha_hasta})`
    );

    return respuestaOk(res, 201, { creadas, omitidas });
  } catch (error) {
    console.error("Error al crear la agenda recurrente:", error);
    return respuestaError(res, 500, "Error al crear la agenda recurrente");
  }
}

// GET /agenda?id_medico=&id_sede=&id_especialidad=&fecha=
// Paciente la usa para encontrar un id_agenda disponible antes de reservar un turno
// (POST /turnos), por lo que queda en modo lectura para cualquier rol autenticado.
export async function listarAgenda(req, res) {
  try {
    const { rol, id } = req.usuario;
    let { id_medico, id_sede, id_especialidad, fecha } = req.query;

    // Un médico solo puede ver su propia agenda, sin importar lo que pida por query
    if (rol === "medico") {
      id_medico = id;
    }

    const condiciones = [];
    const valores = [];

    if (id_medico) {
      condiciones.push("a.id_medico = ?");
      valores.push(id_medico);
    }
    if (id_sede) {
      condiciones.push("a.id_sede = ?");
      valores.push(id_sede);
    }
    if (id_especialidad) {
      condiciones.push("a.id_especialidad = ?");
      valores.push(id_especialidad);
    }
    if (fecha) {
      condiciones.push("a.fecha = ?");
      valores.push(fecha);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    // Se resuelven los nombres acá (médico, especialidad, sede) para que el
    // frontend no tenga que pedirlos uno por uno a partir de los ids.
    const [rows] = await pool.query(
      `SELECT a.id, a.hora_entrada, a.hora_salida, a.fecha,
              a.id_medico, u.nombre AS medico_nombre, u.apellido AS medico_apellido,
              a.id_especialidad, e.descripcion AS especialidad_descripcion,
              a.id_sede, s.nombre AS sede_nombre
       FROM agenda a
       JOIN usuario u ON u.id = a.id_medico
       JOIN especialidad e ON e.id = a.id_especialidad
       JOIN sede s ON s.id = a.id_sede
       ${where}
       ORDER BY a.fecha, a.hora_entrada`,
      valores
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar la agenda:", error);
    return respuestaError(res, 500, "Error al obtener la agenda");
  }
}

// PUT /agenda/:id
export async function modificarAgenda(req, res) {
  try {
    const { id } = req.params;
    const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } =
      req.body;

    if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
      return respuestaError(
        res,
        400,
        "Faltan datos obligatorios: hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede"
      );
    }

    if (hora_entrada >= hora_salida) {
      return respuestaError(res, 400, "La hora de entrada debe ser anterior a la hora de salida");
    }

    if (fecha < hoyISO()) {
      return respuestaError(res, 400, "No se puede modificar un registro de agenda a una fecha pasada");
    }

    const [existentes] = await pool.query("SELECT * FROM agenda WHERE id = ?", [id]);
    if (existentes.length === 0) {
      return respuestaError(res, 404, "El registro de agenda no existe");
    }

    const agendaExistente = existentes[0];
    const { rol, id: idUsuario, id_sede: sedeToken } = req.usuario;

    if (rol === "medico") {
      if (Number(agendaExistente.id_medico) !== Number(idUsuario)) {
        return respuestaError(res, 403, "Un médico solo puede modificar su propia agenda");
      }
      if (Number(id_medico) !== Number(idUsuario)) {
        return respuestaError(res, 403, "Un médico solo puede asignar su propia agenda");
      }
    }

    if (rol === "operador") {
      if (Number(agendaExistente.id_sede) !== Number(sedeToken)) {
        return respuestaError(res, 403, "Un operador solo puede modificar agenda de su propia sede");
      }
      if (Number(id_sede) !== Number(sedeToken)) {
        return respuestaError(res, 403, "Un operador solo puede asignar agenda a su propia sede");
      }
    }

    const errorReferencia = await validarReferencias({ id_medico, id_especialidad, id_sede });
    if (errorReferencia) {
      return respuestaError(res, 400, errorReferencia);
    }

    const [turnosFueraDeRango] = await pool.query(
      `SELECT id FROM turno
       WHERE id_agenda = ? AND estado = 'confirmado' AND (hora < ? OR hora >= ?)
       LIMIT 1`,
      [id, hora_entrada, hora_salida]
    );
    if (turnosFueraDeRango.length > 0) {
      return respuestaError(
        res,
        409,
        "No se puede modificar el horario dejando turnos confirmados fuera del nuevo rango"
      );
    }

    if (await existeSuperposicion({ id_medico, fecha, hora_entrada, hora_salida, idExcluir: id })) {
      return respuestaError(
        res,
        409,
        "El médico ya tiene un registro de agenda que se superpone con ese horario"
      );
    }

    await pool.query(
      `UPDATE agenda
       SET hora_entrada = ?, hora_salida = ?, fecha = ?, id_medico = ?, id_especialidad = ?, id_sede = ?
       WHERE id = ?`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede, id]
    );

    await registrarAuditoria(
      req.usuario.id,
      "MODIFICACION",
      "agenda",
      Number(id),
      `Modificación de agenda del médico ${id_medico} el ${fecha} de ${hora_entrada} a ${hora_salida}`
    );

    return respuestaOk(res, 200, {
      id: Number(id),
      hora_entrada,
      hora_salida,
      fecha,
      id_medico: Number(id_medico),
      id_especialidad: Number(id_especialidad),
      id_sede: Number(id_sede),
    });
  } catch (error) {
    console.error("Error al modificar la agenda:", error);
    return respuestaError(res, 500, "Error al modificar la agenda");
  }
}

// DELETE /agenda/:id
export async function eliminarAgenda(req, res) {
  try {
    const { id } = req.params;

    const [existentes] = await pool.query("SELECT * FROM agenda WHERE id = ?", [id]);
    if (existentes.length === 0) {
      return respuestaError(res, 404, "El registro de agenda no existe");
    }

    const agendaExistente = existentes[0];
    const { rol, id: idUsuario, id_sede: sedeToken } = req.usuario;

    if (rol === "medico" && Number(agendaExistente.id_medico) !== Number(idUsuario)) {
      return respuestaError(res, 403, "Un médico solo puede eliminar su propia agenda");
    }

    if (rol === "operador" && Number(agendaExistente.id_sede) !== Number(sedeToken)) {
      return respuestaError(res, 403, "Un operador solo puede eliminar agenda de su propia sede");
    }

    const [turnosAsociados] = await pool.query(
      "SELECT id FROM turno WHERE id_agenda = ? LIMIT 1",
      [id]
    );

    if (turnosAsociados.length > 0) {
      return respuestaError(
        res,
        409,
        "No se puede eliminar el registro de agenda porque tiene turnos asociados"
      );
    }

    await pool.query("DELETE FROM agenda WHERE id = ?", [id]);

    await registrarAuditoria(req.usuario.id, "BAJA", "agenda", Number(id), "Baja de registro de agenda");

    return respuestaOk(res, 200, {
      id: Number(id),
      mensaje: "Registro de agenda eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar la agenda:", error);
    return respuestaError(res, 500, "Error al eliminar la agenda");
  }
}
