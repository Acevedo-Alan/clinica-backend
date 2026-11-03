import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { eliminarEspecialidad } from "../../src/controllers/especialidadController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

test("eliminarEspecialidad rechaza si tiene medicos asociados", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT id FROM especialidad WHERE id = \?/, [[{ id: 1 }]]],
      [/FROM medico_especialidad\s+WHERE id_especialidad = \?/, [[{ id_medico: 3 }]]],
    ])
  );

  const req = { params: { id: 1 }, usuario: { id: 1 } };
  const res = mockRes();

  await eliminarEspecialidad(req, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.estado, /médicos asociados/);
});

test("eliminarEspecialidad rechaza si esta utilizada en la agenda", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT id FROM especialidad WHERE id = \?/, [[{ id: 1 }]]],
      [/FROM medico_especialidad\s+WHERE id_especialidad = \?/, [[]]],
      [/FROM agenda WHERE id_especialidad = \?/, [[{ id: 7 }]]],
    ])
  );

  const req = { params: { id: 1 }, usuario: { id: 1 } };
  const res = mockRes();

  await eliminarEspecialidad(req, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.estado, /utilizada en la agenda/);
});

test("eliminarEspecialidad elimina cuando no tiene dependencias", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT id FROM especialidad WHERE id = \?/, [[{ id: 1 }]]],
      [/FROM medico_especialidad\s+WHERE id_especialidad = \?/, [[]]],
      [/FROM agenda WHERE id_especialidad = \?/, [[]]],
      [/DELETE FROM especialidad/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = { params: { id: 1 }, usuario: { id: 1 } };
  const res = mockRes();

  await eliminarEspecialidad(req, res);

  assert.equal(res.statusCode, 200);
});
