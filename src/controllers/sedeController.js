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