import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { buscarPacientes } from "../../src/controllers/pacienteController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

test("buscarPacientes rechaza si no se indica dni ni apellido", async () => {
  const req = { query: {} };
  const res = mockRes();

  await buscarPacientes(req, res);

  assert.equal(res.statusCode, 400);
});

test("buscarPacientes busca por dni exacto", async (t) => {
  let valoresUsados = null;
  t.mock.method(pool, "query", async (sql, valores) => {
    valoresUsados = valores;
    return [[{ id: 7, nombre: "Smoke", apellido: "Paciente", dni: "30111222" }]];
  });

  const req = { query: { dni: "30111222" } };
  const res = mockRes();

  await buscarPacientes(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.length, 1);
  assert.deepEqual(valoresUsados, ["30111222"]);
});

test("buscarPacientes busca por apellido parcial", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/apellido LIKE \?/, [[{ id: 7, apellido: "Perez" }]]]]));

  const req = { query: { apellido: "Pere" } };
  const res = mockRes();

  await buscarPacientes(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.length, 1);
});
