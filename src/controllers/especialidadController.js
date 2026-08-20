import pool from "../database/db.js";

import { respuestaOk, respuestaError } from "../utils/respuesta.js";

// POST /especialidades
export async function crearEspecialidad(req, res) {
  try {
    const { descripcion } = req.body;

    if (!descripcion) {
      return respuestaError(
        res,
        400,
        "La descripción es obligatoria"
      );
    }

    const [resultado] = await pool.query(
      "INSERT INTO especialidad (descripcion) VALUES (?)",
      [descripcion]
    );

    return respuestaOk(res, 201, {
      id: resultado.insertId,
      descripcion,
    });
  } catch (error) {
    console.error("Error al crear especialidad:", error);
    return respuestaError(
      res,
      500,
      "Error al crear la especialidad"
    );
  }
}

// GET /especialidades
export async function listarEspecialidades(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, descripcion FROM especialidad ORDER BY id"
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar especialidades:", error);
    return respuestaError(
      res,
      500,
      "Error al obtener las especialidades"
    );
  }
}

// PUT /especialidades/:id
export async function modificarEspecialidad(req, res) {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;

    if (!descripcion) {
      return respuestaError(
        res,
        400,
        "La descripción es obligatoria"
      );
    }

    const [existentes] = await pool.query(
      "SELECT id FROM especialidad WHERE id = ?",
      [id]
    );

    if (existentes.length === 0) {
      return respuestaError(
        res,
        404,
        "La especialidad no existe"
      );
    }

    await pool.query(
      "UPDATE especialidad SET descripcion = ? WHERE id = ?",
      [descripcion, id]
    );

    return respuestaOk(res, 200, {
      id: Number(id),
      descripcion,
    });
  } catch (error) {
    console.error("Error al modificar especialidad:", error);
    return respuestaError(
      res,
      500,
      "Error al modificar la especialidad"
    );
  }
}

// DELETE /especialidades/:id
export async function eliminarEspecialidad(req, res) {
  try {
    const { id } = req.params;

    const [especialidades] = await pool.query(
      "SELECT id FROM especialidad WHERE id = ?",
      [id]
    );

    if (especialidades.length === 0) {
      return respuestaError(
        res,
        404,
        "La especialidad no existe"
      );
    }

    // Verificar médicos asociados
    const [asociaciones] = await pool.query(
      `SELECT id_medico
       FROM medico_especialidad
       WHERE id_especialidad = ?
       LIMIT 1`,
      [id]
    );

    if (asociaciones.length > 0) {
      return respuestaError(
        res,
        409,
        "No se puede eliminar la especialidad porque tiene médicos asociados"
      );
    }

    await pool.query(
      "DELETE FROM especialidad WHERE id = ?",
      [id]
    );

    return respuestaOk(res, 200, {
      id: Number(id),
      mensaje: "Especialidad eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar especialidad:", error);
    return respuestaError(
      res,
      500,
      "Error al eliminar la especialidad"
    );
  }
}