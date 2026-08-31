import pool from "../database/db.js";

import { respuestaOk, respuestaError } from "../utils/respuesta.js";

// POST /sedes - crea una nueva sede

export async function crearSede(req, res) {
  try {
    const { nombre, direccion, telefono } = req.body;

    if (!nombre || !direccion || !telefono) {
      return respuestaError(
        res,
        400,
        "Nombre, dirección y teléfono son obligatorios"
      );
    }

    const [resultado] = await pool.query(
      "INSERT INTO sede (nombre, direccion, telefono) VALUES (?, ?, ?)",
      [nombre, direccion, telefono]
    );

    return respuestaOk(res, 201, {
      id: resultado.insertId,
      nombre,
      direccion,
      telefono,
    });
  } catch (error) {
    console.error("Error al crear la sede:", error);

    return respuestaError(res, 500, "Error al crear la sede");
  }
}

// GET /sedes - lista todas las sedes
export async function listarSedes(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, direccion, telefono FROM sede ORDER BY id"
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar sedes:", error);

    return respuestaError(res, 500, "Error al obtener las sedes");
  }
}

// PUT /sedes/:id - modifica una sede existente
export async function modificarSede(req, res) {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono } = req.body;

    if (!nombre || !direccion || !telefono) {
      return respuestaError(
        res,
        400,
        "Nombre, dirección y teléfono son obligatorios"
      );
    }

    const [existentes] = await pool.query(
      "SELECT id FROM sede WHERE id = ?",
      [id]
    );

    if (existentes.length === 0) {
      return respuestaError(res, 404, "La sede no existe");
    }

    await pool.query(
      "UPDATE sede SET nombre = ?, direccion = ?, telefono = ? WHERE id = ?",
      [nombre, direccion, telefono, id]
    );

    return respuestaOk(res, 200, {
      id: Number(id),
      nombre,
      direccion,
      telefono,
    });
  } catch (error) {
    console.error("Error al modificar la sede:", error);

    return respuestaError(res, 500, "Error al modificar la sede");
  }
}

// DELETE /sedes/:id - elimina una sede si no tiene médicos/operadores ni agenda asociada
export async function eliminarSede(req, res) {
  try {
    const { id } = req.params;

    const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id]);

    if (sedes.length === 0) {
      return respuestaError(res, 404, "La sede no existe");
    }

    const [usuariosAsociados] = await pool.query(
      "SELECT id FROM usuario WHERE id_sede = ? LIMIT 1",
      [id]
    );

    if (usuariosAsociados.length > 0) {
      return respuestaError(
        res,
        409,
        "No se puede eliminar la sede porque tiene médicos u operadores asociados"
      );
    }

    const [agendaAsociada] = await pool.query(
      "SELECT id FROM agenda WHERE id_sede = ? LIMIT 1",
      [id]
    );

    if (agendaAsociada.length > 0) {
      return respuestaError(
        res,
        409,
        "No se puede eliminar la sede porque tiene agenda asociada"
      );
    }

    await pool.query("DELETE FROM sede WHERE id = ?", [id]);

    return respuestaOk(res, 200, {
      id: Number(id),
      mensaje: "Sede eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar la sede:", error);

    return respuestaError(res, 500, "Error al eliminar la sede");
  }
}
