import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

// GET /medicos?id_especialidad=&id_sede=
// Nombre, apellido y especialidades de cada médico, sin otros datos personales.
// Lo usan el operador para cargar agenda, el médico para ver sus propias
// especialidades y el paciente al solicitar un turno.
// "id_sede" filtra por médicos que tengan agenda cargada en esa sede (la sede
// de un médico la define su agenda, no un campo fijo en el usuario).
export async function listarMedicos(req, res) {
  try {
    const { id_especialidad, id_sede } = req.query;

    const condiciones = ["rol = 'medico'"];
    const valores = [];

    if (id_especialidad) {
      condiciones.push("id IN (SELECT id_medico FROM medico_especialidad WHERE id_especialidad = ?)");
      valores.push(id_especialidad);
    }
    if (id_sede) {
      condiciones.push("id IN (SELECT id_medico FROM agenda WHERE id_sede = ?)");
      valores.push(id_sede);
    }

    const [medicos] = await pool.query(
      `SELECT id, nombre, apellido FROM usuario WHERE ${condiciones.join(" AND ")} ORDER BY apellido, nombre`,
      valores
    );

    if (medicos.length === 0) {
      return respuestaOk(res, 200, []);
    }

    const idsMedicos = medicos.map((m) => m.id);
    const [especialidades] = await pool.query(
      `SELECT me.id_medico, e.id, e.descripcion
       FROM medico_especialidad me
       JOIN especialidad e ON e.id = me.id_especialidad
       WHERE me.id_medico IN (?)`,
      [idsMedicos]
    );

    const especialidadesPorMedico = new Map();
    for (const fila of especialidades) {
      const lista = especialidadesPorMedico.get(fila.id_medico) ?? [];
      lista.push({ id: fila.id, descripcion: fila.descripcion });
      especialidadesPorMedico.set(fila.id_medico, lista);
    }

    const resultado = medicos.map((medico) => ({
      id: medico.id,
      nombre: medico.nombre,
      apellido: medico.apellido,
      especialidades: especialidadesPorMedico.get(medico.id) ?? [],
    }));

    return respuestaOk(res, 200, resultado);
  } catch (error) {
    console.error("Error al listar médicos:", error);
    return respuestaError(res, 500, "Error al obtener los médicos");
  }
}
