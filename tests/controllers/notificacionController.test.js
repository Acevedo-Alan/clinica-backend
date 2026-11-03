import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { listarNotificaciones, marcarLeida } from "../../src/controllers/notificacionController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

test("listarNotificaciones devuelve las propias del usuario autenticado", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM notificacion WHERE id_usuario = \?/, [[{ id: 1, tipo: "turno_confirmado" }]]]])
  );

  const req = { usuario: { id: 7 } };
  const res = mockRes();

  await listarNotificaciones(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.length, 1);
});

test("marcarLeida responde 404 si la notificacion no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM notificacion WHERE id = \?/, [[]]]]));

  const req = { params: { id: 1 }, usuario: { id: 7 } };
  const res = mockRes();

  await marcarLeida(req, res);

  assert.equal(res.statusCode, 404);
});

test("marcarLeida rechaza marcar la notificacion de otro usuario", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM notificacion WHERE id = \?/, [[{ id: 1, id_usuario: 999 }]]]])
  );

  const req = { params: { id: 1 }, usuario: { id: 7 } };
  const res = mockRes();

  await marcarLeida(req, res);

  assert.equal(res.statusCode, 403);
});

test("marcarLeida marca como leida la notificacion propia", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM notificacion WHERE id = \?/, [[{ id: 1, id_usuario: 7 }]]],
      [/UPDATE notificacion SET leida = 1/, [{}]],
    ])
  );

  const req = { params: { id: 1 }, usuario: { id: 7 } };
  const res = mockRes();

  await marcarLeida(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.leida, true);
});
