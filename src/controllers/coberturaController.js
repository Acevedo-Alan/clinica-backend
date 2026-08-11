import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

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
