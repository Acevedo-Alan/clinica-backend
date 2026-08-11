/**
 * Helper para mantener la estructura de respuesta uniforme exigida por el enunciado:
 * { codigo, estado, datos }
 */

export function respuestaOk(res, codigo = 200, datos = null) {
  return res.status(codigo).json({
    codigo,
    estado: "ok",
    datos,
  });
}

export function respuestaError(res, codigo = 500, mensaje = "Error interno del servidor") {
  return res.status(codigo).json({
    codigo,
    estado: mensaje,
    datos: null,
  });
}
