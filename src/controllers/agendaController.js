import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

async function validarReferenciasAgenda(id_medico, id_especialidad, id_sede) {
  const [[medicos], [especialidades], [sedes]] = await Promise.all([
    pool.query("SELECT id FROM usuario WHERE id = ? AND rol = 'medico'", [id_medico]),
    pool.query("SELECT id FROM especialidad WHERE id = ?", [id_especialidad]),
    pool.query("SELECT id FROM sede WHERE id = ?", [id_sede]),
  ]);

  if (medicos.length === 0) return "El médico no existe";
  if (especialidades.length === 0) return "La especialidad no existe";
  if (sedes.length === 0) return "La sede no existe";
  return null;
}

// POST /agenda - alta
// Protegido: medico (solo puede cargar su propia agenda, id_medico = el del token) u operador (cualquiera)
export async function crearAgenda(req, res) {
  try {
    const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } = req.body;

    if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
      return respuestaError(
        res,
        400,
        "hora_entrada, hora_salida, fecha, id_medico, id_especialidad e id_sede son obligatorios"
      );
    }

    // Un médico solo puede cargar agenda propia
    if (req.usuario.rol === "medico" && Number(id_medico) !== Number(req.usuario.id)) {
      return respuestaError(res, 403, "Un médico solo puede cargar su propia agenda");
    }

    const errorReferencias = await validarReferenciasAgenda(
      id_medico,
      id_especialidad,
      id_sede
    );
    if (errorReferencias) {
      return respuestaError(res, 400, errorReferencias);
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
    console.error("Error al crear agenda:", error);
    return respuestaError(res, 500, "Error al crear la agenda");
  }
}

// GET /agenda - listado filtrable por id_medico, id_sede y fecha (query params)
// Mismo control de rol: un médico solo puede ver su propia agenda, un operador puede ver cualquiera
export async function listarAgenda(req, res) {
  try {
    const { id_medico, id_sede, fecha } = req.query;

    const condiciones = [];
    const valores = [];

    // Un médico no puede pedir la agenda de otro: se fuerza el filtro a la suya
    if (req.usuario.rol === "medico") {
      condiciones.push("id_medico = ?");
      valores.push(req.usuario.id);
    } else if (id_medico) {
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
    console.error("Error al listar agenda:", error);
    return respuestaError(res, 500, "Error al obtener la agenda");
  }
}

// PUT /agenda/:id - modificación
// Mismo control: médico solo la suya, operador cualquiera
export async function modificarAgenda(req, res) {
  try {
    const { id } = req.params;
    const { hora_entrada, hora_salida, fecha, id_medico, id_especialidad, id_sede } = req.body;

    if (!hora_entrada || !hora_salida || !fecha || !id_medico || !id_especialidad || !id_sede) {
      return respuestaError(
        res,
        400,
        "hora_entrada, hora_salida, fecha, id_medico, id_especialidad e id_sede son obligatorios"
      );
    }

    const [existentes] = await pool.query("SELECT * FROM agenda WHERE id = ?", [id]);

    if (existentes.length === 0) {
      return respuestaError(res, 404, "La agenda no existe");
    }

    const agendaActual = existentes[0];

    // Un médico solo puede modificar agenda propia (la existente y la que intenta asignar)
    if (
      req.usuario.rol === "medico" &&
      (Number(agendaActual.id_medico) !== Number(req.usuario.id) ||
        Number(id_medico) !== Number(req.usuario.id))
    ) {
      return respuestaError(res, 403, "Un médico solo puede modificar su propia agenda");
    }

    const errorReferencias = await validarReferenciasAgenda(
      id_medico,
      id_especialidad,
      id_sede
    );
    if (errorReferencias) {
      return respuestaError(res, 400, errorReferencias);
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
    console.error("Error al modificar agenda:", error);
    return respuestaError(res, 500, "Error al modificar la agenda");
  }
}

// DELETE /agenda/:id - baja
// Mismo control: médico solo la suya, operador cualquiera
export async function eliminarAgenda(req, res) {
  try {
    const { id } = req.params;

    const [existentes] = await pool.query("SELECT * FROM agenda WHERE id = ?", [id]);

    if (existentes.length === 0) {
      return respuestaError(res, 404, "La agenda no existe");
    }

    const agendaActual = existentes[0];

    if (req.usuario.rol === "medico" && Number(agendaActual.id_medico) !== Number(req.usuario.id)) {
      return respuestaError(res, 403, "Un médico solo puede eliminar su propia agenda");
    }

    await pool.query("DELETE FROM agenda WHERE id = ?", [id]);

    return respuestaOk(res, 200, {
      id: Number(id),
      mensaje: "Agenda eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar agenda:", error);
    return respuestaError(res, 500, "Error al eliminar la agenda");
  }
}
