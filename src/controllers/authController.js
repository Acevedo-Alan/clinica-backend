import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";
import { registrarAuditoria } from "../utils/auditoria.js";

const SALT_ROUNDS = 10;

// POST /auth/registro
// Alta de un paciente. El rol queda fijo en "paciente".
export async function registro(req, res) {
  try {
    const {
      nombre,
      apellido,
      dni,
      email,
      password,
      fecha_nacimiento,
      id_cobertura,
      telefono,
    } = req.body;

    // Validación básica de campos requeridos
    if (!nombre || !apellido || !dni || !email || !password || !fecha_nacimiento || !id_cobertura) {
      return respuestaError(res, 400, "Faltan datos obligatorios: nombre, apellido, dni, email, password, fecha_nacimiento, id_cobertura");
    }

    // Validar que la cobertura elegida exista
    const [coberturas] = await pool.query("SELECT id FROM cobertura WHERE id = ?", [id_cobertura]);
    if (coberturas.length === 0) {
      return respuestaError(res, 400, "La cobertura seleccionada no existe");
    }

    // Validar que DNI y email no estén duplicados
    const [existentes] = await pool.query(
      "SELECT id FROM usuario WHERE dni = ? OR email = ?",
      [dni, email]
    );
    if (existentes.length > 0) {
      return respuestaError(res, 409, "Ya existe un usuario registrado con ese DNI o email");
    }

    const passwordHasheada = await bcrypt.hash(password, SALT_ROUNDS);

    const [resultado] = await pool.query(
      `INSERT INTO usuario (apellido, nombre, fecha_nacimiento, password, rol, email, telefono, dni, id_sede, id_cobertura)
       VALUES (?, ?, ?, ?, 'paciente', ?, ?, ?, NULL, ?)`,
      [apellido, nombre, fecha_nacimiento, passwordHasheada, email, telefono || "", dni, id_cobertura]
    );

    // No hay actor autenticado en el self-registro: queda registrado el propio usuario nuevo.
    await registrarAuditoria(
      resultado.insertId,
      "ALTA",
      "usuario",
      resultado.insertId,
      `Alta de paciente ${nombre} ${apellido} (DNI ${dni})`
    );

    return respuestaOk(res, 201, {
      id: resultado.insertId,
      nombre,
      apellido,
      email,
      rol: "paciente",
    });
  } catch (error) {
    console.error("Error en registro:", error);
    return respuestaError(res, 500, "Error al registrar el usuario");
  }
}

// POST /auth/login
export async function login(req, res) {
  try {
    const { dni, password } = req.body;

    if (!dni || !password) {
      return respuestaError(res, 400, "Debe enviar dni y password");
    }

    const [usuarios] = await pool.query("SELECT * FROM usuario WHERE dni = ?", [dni]);

    if (usuarios.length === 0) {
      return respuestaError(res, 401, "Credenciales inválidas");
    }

    const usuario = usuarios[0];
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return respuestaError(res, 401, "Credenciales inválidas");
    }

    const payload = {
      id: usuario.id,
      rol: usuario.rol,
      id_sede: usuario.id_sede,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    });

    return respuestaOk(res, 200, {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        email: usuario.email,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return respuestaError(res, 500, "Error al iniciar sesión");
  }
}

// GET /auth/perfil (protegido)
export async function perfil(req, res) {
  try {
    const { id } = req.usuario; // viene del token, seteado por verificarToken

    const [usuarios] = await pool.query(
      "SELECT id, apellido, nombre, fecha_nacimiento, rol, email, telefono, dni, id_sede, id_cobertura FROM usuario WHERE id = ?",
      [id]
    );

    if (usuarios.length === 0) {
      return respuestaError(res, 404, "Usuario no encontrado");
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
    console.error("Error en perfil:", error);
    return respuestaError(res, 500, "Error al obtener el perfil");
  }
}

// PUT /auth/perfil (protegido) - el usuario edita sus propios datos.
// El paciente solo puede tocar email, teléfono y cobertura (nombre, apellido,
// fecha_nacimiento y dni quedan a cargo del administrador). El resto de los
// roles no tiene cobertura y mantiene el edit de contacto que ya tenían.
export async function actualizarPerfil(req, res) {
  try {
    const { id, rol } = req.usuario;

    if (rol === "paciente") {
      const { email, telefono, id_cobertura } = req.body;

      if (!email || !id_cobertura) {
        return respuestaError(res, 400, "Faltan datos obligatorios: email, id_cobertura");
      }

      const [emailDuplicado] = await pool.query(
        "SELECT id FROM usuario WHERE email = ? AND id <> ?",
        [email, id]
      );
      if (emailDuplicado.length > 0) {
        return respuestaError(res, 409, "Ya existe otro usuario registrado con ese email");
      }

      const [coberturas] = await pool.query("SELECT id FROM cobertura WHERE id = ?", [id_cobertura]);
      if (coberturas.length === 0) {
        return respuestaError(res, 400, "La cobertura indicada no existe");
      }

      await pool.query(
        "UPDATE usuario SET email = ?, telefono = ?, id_cobertura = ? WHERE id = ?",
        [email, telefono || "", id_cobertura, id]
      );
    } else {
      const { nombre, apellido, email, telefono, fecha_nacimiento } = req.body;

      if (!nombre || !apellido || !email || !fecha_nacimiento) {
        return respuestaError(
          res,
          400,
          "Faltan datos obligatorios: nombre, apellido, email, fecha_nacimiento"
        );
      }

      const [emailDuplicado] = await pool.query(
        "SELECT id FROM usuario WHERE email = ? AND id <> ?",
        [email, id]
      );
      if (emailDuplicado.length > 0) {
        return respuestaError(res, 409, "Ya existe otro usuario registrado con ese email");
      }

      await pool.query(
        `UPDATE usuario
         SET nombre = ?, apellido = ?, email = ?, telefono = ?, fecha_nacimiento = ?
         WHERE id = ?`,
        [nombre, apellido, email, telefono || "", fecha_nacimiento, id]
      );
    }

    await registrarAuditoria(id, "MODIFICACION", "usuario", id, "Modificación de perfil propio");

    const [usuarios] = await pool.query(
      "SELECT id, apellido, nombre, fecha_nacimiento, rol, email, telefono, dni, id_sede, id_cobertura FROM usuario WHERE id = ?",
      [id]
    );

    return respuestaOk(res, 200, usuarios[0]);
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return respuestaError(res, 500, "Error al actualizar el perfil");
  }
}

// PUT /auth/password (protegido) - cambio de contraseña propia.
export async function cambiarPassword(req, res) {
  try {
    const { id } = req.usuario;
    const { passwordActual, passwordNueva, confirmarPassword } = req.body;

    if (!passwordActual || !passwordNueva || !confirmarPassword) {
      return respuestaError(
        res,
        400,
        "Faltan datos obligatorios: passwordActual, passwordNueva, confirmarPassword"
      );
    }

    if (passwordNueva !== confirmarPassword) {
      return respuestaError(res, 400, "La nueva contraseña y su confirmación no coinciden");
    }

    if (passwordNueva.length < 8) {
      return respuestaError(res, 400, "La nueva contraseña debe tener al menos 8 caracteres");
    }

    const [usuarios] = await pool.query("SELECT password FROM usuario WHERE id = ?", [id]);
    if (usuarios.length === 0) {
      return respuestaError(res, 404, "Usuario no encontrado");
    }

    const passwordValida = await bcrypt.compare(passwordActual, usuarios[0].password);
    if (!passwordValida) {
      return respuestaError(res, 401, "La contraseña actual es incorrecta");
    }

    const passwordHasheada = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
    await pool.query("UPDATE usuario SET password = ? WHERE id = ?", [passwordHasheada, id]);

    await registrarAuditoria(id, "MODIFICACION", "usuario", id, "Cambio de contraseña propia");

    return respuestaOk(res, 200, { mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error);
    return respuestaError(res, 500, "Error al cambiar la contraseña");
  }
}
