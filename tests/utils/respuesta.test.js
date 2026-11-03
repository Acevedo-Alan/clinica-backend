import { test } from "node:test";
import assert from "node:assert/strict";

import { respuestaOk, respuestaError } from "../../src/utils/respuesta.js";
import { mockRes } from "../helpers/http.js";

test("respuestaOk responde con estado 'ok' y los datos recibidos", () => {
  const res = mockRes();
  respuestaOk(res, 201, { id: 1 });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { codigo: 201, estado: "ok", datos: { id: 1 } });
});

test("respuestaOk usa 200 y datos=null por defecto", () => {
  const res = mockRes();
  respuestaOk(res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { codigo: 200, estado: "ok", datos: null });
});

test("respuestaError responde con el mensaje como estado y datos=null", () => {
  const res = mockRes();
  respuestaError(res, 404, "No encontrado");
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { codigo: 404, estado: "No encontrado", datos: null });
});
