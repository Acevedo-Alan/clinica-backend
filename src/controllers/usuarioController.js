import bcrypt from "bcrypt";
import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";
import { registrarAuditoria } from "../utils/auditoria.js";
import { parsePaginacion, datosPaginados } from "../utils/paginacion.js";

const SALT_ROUNDS = 10;
const ROLES_GESTIONABLES = ["operador", "medico", "administrador"];

const CAMPOS_USUARIO =
  "id, apellido, nombre, fecha_nacimiento, rol, email, telefono, dni, id_sede, id_cobertura";

// Reemplaza por completo las especialidades de un médico.
async function asignarEspecialidades(idMedico, idsEspecialidad) {
  await pool.query("DELETE FROM medico_especialidad WHERE id_medico = ?", [idMedico]);
  if (idsEspecialidad.length === 0) return;
  const valores = idsEspecialidad.map((idEspecialidad) => [idMedico, idEspecialidad]);
  await pool.query("INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES ?", [valores]);
}

// Valida una lista de ids de especialidad contra la tabla y devuelve los ids únicos (numéricos).
async function validarEspecialidades(especialidades) {
  if (!Array.isArray(especialidades) || especialidades.length === 0) {
    return { error: "Debe indicar al menos una especialidad para el médico" };
  }
  const idsUnicos = [...new Set(especialidades.map(Number))];
  if (idsUnicos.some((id) => Number.isNaN(id))) {
    return { error: "Las especialidades deben ser ids numéricos" };
  }
  const [filas] = await pool.query("SELECT id FROM especialidad WHERE id IN (?)", [idsUnicos]);
  if (filas.length !== idsUnicos.length) {
    return { error: "Alguna de las especialidades indicadas no existe" };
  }
  return { idsUnicos };
}

// GET /usuarios?nombre=&apellido=&rol=&id_sede=&page=&pageSize=
export async function listarUsuarios(req, res) {
  try {
    const { nombre, apellido, rol, id_sede } = req.query;
    const { page, pageSize, offset } = parsePaginacion(req.query);

    const condiciones = [];
    const valores = [];
    if (nombre) {
      condiciones.push("nombre LIKE ?");
      valores.push(`%${nombre}%`);
    }
    if (apellido) {
      condiciones.push("apellido LIKE ?");
      valores.push(`%${apellido}%`);
    }
    if (rol) {
      condiciones.push("rol = ?");
      valores.push(rol);
    }
    if (id_sede) {
      condiciones.push("id_sede = ?");
      valores.push(id_sede);
    }
    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM usuario ${where}`, valores);

    const [filas] = await pool.query(
      `SELECT ${CAMPOS_USUARIO} FROM usuario ${where} ORDER BY apellido, nombre LIMIT ? OFFSET ?`,
      [...valores, pageSize, offset]
    );

    return respuestaOk(res, 200, datosPaginados(filas, total, page, pageSize));
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    return respuestaError(res, 500, "Error al obtener los usuarios");
  }
}

// GET /usuarios/:id
export async function obtenerUsuario(req, res) {
  try {
    const { id } = req.params;

    const [usuarios] = await pool.query(`SELECT ${CAMPOS_USUARIO} FROM usuario WHERE id = ?`, [id]);
    if (usuarios.length === 0) {
      return respuestaError(res, 404, "El usuario no existe");
    }
    const usuario = usuarios[0];

    if (usuario.rol === "medico") {
      const [especialidades] = await pool.query(
        "SELECT id_especialidad FROM medico_especialidad WHERE id_medico = ?",
        [id]
      );
      usuario.especialidades = especialidades.map((e) => e.id_especialidad);
    }

    return respuestaOk(res, 200, usuario);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return respuestaError(res, 500, "Error al obtener el usuario");
  }
}

// POST /usuarios - alta de operador, médico o administrador (el paciente se da de alta por /auth/registro)
export async function crearUsuario(req, res) {
  try {
    const { nombre, apellido, dni, email, password, fecha_nacimiento, telefono, rol, id_sede, especialidades } =
      req.body;

    if (!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento || !rol) {
      return respuestaError(
        res,
        400,
        "Faltan datos obligatorios: nombre, apellido, dni, email, password, fecha_nacimiento, rol"
      );
    }

    if (!ROLES_GESTIONABLES.includes(rol)) {
      return respuestaError(res, 400, `El rol debe ser uno de: ${ROLES_GESTIONABLES.join(", ")}`);
    }

    let idSedeFinal = null;
    if (rol === "operador" || rol === "medico") {
      if (!id_sede) {
        return respuestaError(res, 400, "Debe indicar la sede para operador o médico");
      }
      const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id_sede]);
      if (sedes.length === 0) {
        return respuestaError(res, 400, "La sede indicada no existe");
      }
      idSedeFinal = id_sede;
    }

    let idsEspecialidad = [];
    if (rol === "medico") {
      const resultado = await validarEspecialidades(especialidades);
      if (resultado.error) {
        return respuestaError(res, 400, resultado.error);
      }
      idsEspecialidad = resultado.idsUnicos;
    }

    const [existentes] = await pool.query("SELECT id FROM usuario WHERE dni = ? OR email = ?", [dni, email]);
    if (existentes.length > 0) {
      return respuestaError(res, 409, "Ya existe un usuario registrado con ese DNI o email");
    }

    const passwordHasheada = await bcrypt.hash(password, SALT_ROUNDS);

    const [resultado] = await pool.query(
      `INSERT INTO usuario (apellido, nombre, fecha_nacimiento, password, rol, email, telefono, dni, id_sede, id_cobertura)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [apellido, nombre, fecha_nacimiento, passwordHasheada, rol, email, telefono || "", dni, idSedeFinal]
    );

    if (rol === "medico") {
      await asignarEspecialidades(resultado.insertId, idsEspecialidad);
    }

    await registrarAuditoria(
      req.usuario.id,
      "ALTA",
      "usuario",
      resultado.insertId,
      `Alta de ${rol} ${nombre} ${apellido} (DNI ${dni})`
    );

    return respuestaOk(res, 201, {
      id: resultado.insertId,
      nombre,
      apellido,
      dni,
      email,
      telefono: telefono || "",
      fecha_nacimiento,
      rol,
      id_sede: idSedeFinal,
      id_cobertura: null,
      especialidades: idsEspecialidad,
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return respuestaError(res, 500, "Error al crear el usuario");
  }
}

// PUT /usuarios/:id - edición de cualquier usuario (operador, médico, administrador o paciente).
// El rol y el DNI no se modifican por esta vía.
export async function modificarUsuario(req, res) {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, fecha_nacimiento, id_sede, id_cobertura, especialidades } = req.body;

    if (!nombre || !apellido || !email || !fecha_nacimiento) {
      return respuestaError(res, 400, "Faltan datos obligatorios: nombre, apellido, email, fecha_nacimiento");
    }

    const [usuarios] = await pool.query("SELECT * FROM usuario WHERE id = ?", [id]);
    if (usuarios.length === 0) {
      return respuestaError(res, 404, "El usuario no existe");
    }
    const usuario = usuarios[0];

    const [emailDuplicado] = await pool.query("SELECT id FROM usuario WHERE email = ? AND id <> ?", [email, id]);
    if (emailDuplicado.length > 0) {
      return respuestaError(res, 409, "Ya existe otro usuario registrado con ese email");
    }

    let idSedeFinal = usuario.id_sede;
    if (usuario.rol === "operador" || usuario.rol === "medico") {
      if (!id_sede) {
        return respuestaError(res, 400, "Debe indicar la sede");
      }
      const [sedes] = await pool.query("SELECT id FROM sede WHERE id = ?", [id_sede]);
      if (sedes.length === 0) {
        return respuestaError(res, 400, "La sede indicada no existe");
      }
      idSedeFinal = id_sede;
    }

    let idCoberturaFinal = usuario.id_cobertura;
    if (usuario.rol === "paciente") {
      if (!id_cobertura) {
        return respuestaError(res, 400, "Debe indicar la cobertura");
      }
      const [coberturas] = await pool.query("SELECT id FROM cobertura WHERE id = ?", [id_cobertura]);
      if (coberturas.length === 0) {
        return respuestaError(res, 400, "La cobertura indicada no existe");
      }
      idCoberturaFinal = id_cobertura;
    }

    let idsEspecialidad;
    if (usuario.rol === "medico") {
      const resultado = await validarEspecialidades(especialidades);
      if (resultado.error) {
        return respuestaError(res, 400, resultado.error);
      }
      idsEspecialidad = resultado.idsUnicos;
      await asignarEspecialidades(id, idsEspecialidad);
    }

    await pool.query(
      `UPDATE usuario
       SET nombre = ?, apellido = ?, email = ?, telefono = ?, fecha_nacimiento = ?, id_sede = ?, id_cobertura = ?
       WHERE id = ?`,
      [nombre, apellido, email, telefono || "", fecha_nacimiento, idSedeFinal, idCoberturaFinal, id]
    );

    await registrarAuditoria(
      req.usuario.id,
      "MODIFICACION",
      "usuario",
      Number(id),
      `Modificación de usuario ${nombre} ${apellido}`
    );

    return respuestaOk(res, 200, {
      id: Number(id),
      nombre,
      apellido,
      dni: usuario.dni,
      email,
      telefono: telefono || "",
      fecha_nacimiento,
      rol: usuario.rol,
      id_sede: idSedeFinal,
      id_cobertura: idCoberturaFinal,
      ...(idsEspecialidad ? { especialidades: idsEspecialidad } : {}),
    });
  } catch (error) {
    console.error("Error al modificar usuario:", error);
    return respuestaError(res, 500, "Error al modificar el usuario");
  }
}
