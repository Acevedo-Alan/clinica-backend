import jwt from "jsonwebtoken";
import { respuestaError } from "../utils/respuesta.js";

/**
 * Valida que venga un JWT válido en el header Authorization: Bearer <token>.
 * Si es válido, guarda el payload decodificado en req.usuario y sigue.
 * Si no, responde 401.
 */
export function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return respuestaError(res, 401, "Token no provisto");
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload; // { id, rol, id_sede }
    next();
  } catch (error) {
    return respuestaError(res, 401, "Token inválido o vencido");
  }
}

/**
 * Debe usarse DESPUÉS de verificarToken.
 * Recibe la lista de roles permitidos para el endpoint y valida que
 * el rol del usuario autenticado esté entre ellos.
 * Uso: verificarRol("admin", "operador")
 */
export function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return respuestaError(res, 401, "No autenticado");
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return respuestaError(res, 403, "No tiene permisos para acceder a este recurso");
    }

    next();
  };
}
