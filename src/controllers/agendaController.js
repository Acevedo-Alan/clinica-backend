import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

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

    const { rol, id } = req.usuario;

    if (rol === "medico" && Number(id_medico) !== Number(id)) {
      return respuestaError(res, 403, "Un médico solo puede crear su propia agenda");
    }

    const errorReferencia = await validarReferencias({ id_medico, id_especialidad, id_sede });
    if (errorReferencia) {
      return respuestaError(res, 400, errorReferencia);
    }

    const [resultado] = await pool.query(
      `INSERT INTO agenda (hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede]
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

// GET /agenda?id_medico=&id_sede=&fecha=
export async function listarAgenda(req, res) {
  try {
    const { rol, id } = req.usuario;
    let { id_medico, id_sede, fecha } = req.query;

    // Un médico solo puede ver su propia agenda, sin importar lo que pida por query
    if (rol === "medico") {
      id_medico = id;
    }

    const condiciones = [];
    const valores = [];

    if (id_medico) {
      condiciones.push("id_medico = ?");
      valores.push(id_medico);
    }
    if (id_sede) {
      condiciones.push("id_sede = ?");
      valores.push(id_sede);
    }
    if (fecha) {
      condiciones.push("fecha = ?");
      valores.push(fecha);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT id, hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede
       FROM agenda ${where} ORDER BY fecha, hora_entrada`,
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

    const [existentes] = await pool.query("SELECT * FROM agenda WHERE id = ?", [id]);
    if (existentes.length === 0) {
      return respuestaError(res, 404, "El registro de agenda no existe");
    }

    const agendaExistente = existentes[0];
    const { rol, id: idUsuario } = req.usuario;

    if (rol === "medico") {
      if (Number(agendaExistente.id_medico) !== Number(idUsuario)) {
        return respuestaError(res, 403, "Un médico solo puede modificar su propia agenda");
      }
      if (Number(id_medico) !== Number(idUsuario)) {
        return respuestaError(res, 403, "Un médico solo puede asignar su propia agenda");
      }
    }

    const errorReferencia = await validarReferencias({ id_medico, id_especialidad, id_sede });
    if (errorReferencia) {
      return respuestaError(res, 400, errorReferencia);
    }

    await pool.query(
      `UPDATE agenda
       SET hora_entrada = ?, hora_salida = ?, fecha = ?, id_medico = ?, id_especialidad = ?, id_sede = ?
       WHERE id = ?`,
      [hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede, id]
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
    const { rol, id: idUsuario } = req.usuario;

    if (rol === "medico" && Number(agendaExistente.id_medico) !== Number(idUsuario)) {
      return respuestaError(res, 403, "Un médico solo puede eliminar su propia agenda");
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

    return respuestaOk(res, 200, {
      id: Number(id),
      mensaje: "Registro de agenda eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar la agenda:", error);
    return respuestaError(res, 500, "Error al eliminar la agenda");
  }
}
