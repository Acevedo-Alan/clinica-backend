import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

// GET /publico/landing - datos para la portada, sin autenticación.
// Solo expone lo que ya es público de una clínica: especialidades, sedes, coberturas
// y los médicos (nombre, apellido y especialidades). Nunca DNI, email ni teléfono.
export async function datosLanding(req, res) {
  try {
    const [especialidades] = await pool.query(
      "SELECT id, descripcion FROM especialidad ORDER BY descripcion"
    );
    const [sedes] = await pool.query(
      "SELECT id, nombre, direccion, telefono FROM sede ORDER BY nombre"
    );
    const [coberturas] = await pool.query(
      "SELECT id, nombre FROM cobertura ORDER BY nombre"
    );
    const [filasMedicos] = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, e.descripcion AS especialidad
       FROM usuario u
       JOIN medico_especialidad me ON me.id_medico = u.id
       JOIN especialidad e ON e.id = me.id_especialidad
       WHERE u.rol = 'medico'
       ORDER BY u.apellido, u.nombre, e.descripcion`
    );

    // Un médico puede tener varias especialidades: se agrupa en una sola entrada.
    const porMedico = new Map();
    for (const fila of filasMedicos) {
      if (!porMedico.has(fila.id)) {
        porMedico.set(fila.id, {
          id: fila.id,
          nombre: fila.nombre,
          apellido: fila.apellido,
          especialidades: [],
        });
      }
      porMedico.get(fila.id).especialidades.push(fila.especialidad);
    }

    return respuestaOk(res, 200, {
      especialidades,
      sedes,
      coberturas,
      medicos: [...porMedico.values()],
    });
  } catch (error) {
    console.error("Error al obtener los datos de la portada:", error);
    return respuestaError(res, 500, "Error al obtener los datos de la portada");
  }
}
