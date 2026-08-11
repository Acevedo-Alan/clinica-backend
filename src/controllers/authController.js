import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

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
    const { email, password } = req.body;

    if (!email || !password) {
      return respuestaError(res, 400, "Debe enviar email y password");
    }

    const [usuarios] = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);

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

// GET /auth/usuarios (protegido: verificarToken + verificarRol("admin","operador"))
// Endpoint de prueba pensado para validar el middleware verificarRol.
export async function listarUsuarios(req, res) {
  try {
    const [usuarios] = await pool.query(
      "SELECT id, apellido, nombre, rol, email, dni, id_sede, id_cobertura FROM usuario"
    );
    return respuestaOk(res, 200, usuarios);
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    return respuestaError(res, 500, "Error al obtener los usuarios");
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

    return respuestaOk(res, 200, usuarios[0]);
  } catch (error) {
    console.error("Error en perfil:", error);
    return respuestaError(res, 500, "Error al obtener el perfil");
  }
}
