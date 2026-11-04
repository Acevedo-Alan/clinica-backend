import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

const CAMPOS_PACIENTE = "id, nombre, apellido, dni, fecha_nacimiento, telefono, email, id_cobertura";

// GET /pacientes?dni=&apellido=
// Búsqueda para operador/médico/administrador (asignar turno, consultar
// historial). Exige al menos un filtro para no devolver todo el padrón.
export async function buscarPacientes(req, res) {
  try {
    const { dni, apellido } = req.query;

    if (!dni && !apellido) {
      return respuestaError(res, 400, "Debe indicar dni o apellido para buscar");
    }

    const condiciones = ["rol = 'paciente'"];
    const valores = [];

    if (dni) {
      condiciones.push("dni = ?");
      valores.push(dni);
    }
    if (apellido) {
      condiciones.push("apellido LIKE ?");
      valores.push(`%${apellido}%`);
    }

    const [rows] = await pool.query(
      `SELECT ${CAMPOS_PACIENTE} FROM usuario WHERE ${condiciones.join(" AND ")} ORDER BY apellido, nombre LIMIT 50`,
      valores
    );

    return respuestaOk(res, 200, rows);
  } catch (error) {
    console.error("Error al buscar pacientes:", error);
    return respuestaError(res, 500, "Error al buscar pacientes");
  }
}
