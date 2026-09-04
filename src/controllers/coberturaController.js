import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";
import { registrarAuditoria } from "../utils/auditoria.js";

// GET /coberturas - lista las coberturas disponibles para elegir al registrarse
export async function listarCoberturas(req, res) {
  try {
    const [rows] = await pool.query("SELECT id, nombre FROM cobertura");
    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al listar coberturas:", error);
    return respuestaError(res, 500, "Error al obtener las coberturas");
  }
}

// POST /coberturas
export async function crearCobertura(req, res) {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return respuestaError(res, 400, "El nombre es obligatorio");
    }

    const [resultado] = await pool.query(
      "INSERT INTO cobertura (nombre) VALUES (?)",
      [nombre]
    );

    await registrarAuditoria(
      req.usuario.id,
      "ALTA",
      "cobertura",
      resultado.insertId,
      `Alta de cobertura ${nombre}`
    );

    return respuestaOk(res, 201, {
      id: resultado.insertId,
      nombre,
    });
  } catch (error) {
    console.error("Error al crear cobertura:", error);
    return respuestaError(res, 500, "Error al crear la cobertura");
  }
}

// PUT /coberturas/:id
export async function modificarCobertura(req, res) {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
      return respuestaError(res, 400, "El nombre es obligatorio");
    }

    const [existentes] = await pool.query(
      "SELECT id FROM cobertura WHERE id = ?",
      [id]
    );

    if (existentes.length === 0) {
      return respuestaError(res, 404, "La cobertura no existe");
    }

    await pool.query("UPDATE cobertura SET nombre = ? WHERE id = ?", [
      nombre,
      id,
    ]);

    await registrarAuditoria(
      req.usuario.id,
      "MODIFICACION",
      "cobertura",
      Number(id),
      `Modificación de cobertura a ${nombre}`
    );

    return respuestaOk(res, 200, {
      id: Number(id),
      nombre,
    });
  } catch (error) {
    console.error("Error al modificar cobertura:", error);
    return respuestaError(res, 500, "Error al modificar la cobertura");
  }
}

// DELETE /coberturas/:id
export async function eliminarCobertura(req, res) {
  try {
    const { id } = req.params;

    const [coberturas] = await pool.query(
      "SELECT id FROM cobertura WHERE id = ?",
      [id]
    );

    if (coberturas.length === 0) {
      return respuestaError(res, 404, "La cobertura no existe");
    }

    const [asociaciones] = await pool.query(
      "SELECT id FROM usuario WHERE id_cobertura = ? LIMIT 1",
      [id]
    );

    if (asociaciones.length > 0) {
      return respuestaError(
        res,
        409,
        "No se puede eliminar la cobertura porque tiene usuarios asociados"
      );
    }

    await pool.query("DELETE FROM cobertura WHERE id = ?", [id]);

    await registrarAuditoria(
      req.usuario.id,
      "BAJA",
      "cobertura",
      Number(id),
      `Baja de cobertura ${coberturas[0].nombre}`
    );

    return respuestaOk(res, 200, {
      id: Number(id),
      mensaje: "Cobertura eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar cobertura:", error);
    return respuestaError(res, 500, "Error al eliminar la cobertura");
  }
}
