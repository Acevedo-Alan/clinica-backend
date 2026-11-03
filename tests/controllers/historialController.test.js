import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { crearHistorial, listarHistorialPaciente } from "../../src/controllers/historialController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

const TURNO_ATENDIDO = { id: 1, estado: "atendido", id_paciente: 7, id_medico: 3 };

test("crearHistorial rechaza si el turno no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM turno t/, [[]]]]));

  const req = { body: { id_turno: 1, diagnostico: "Gripe" }, usuario: { id: 3 } };
  const res = mockRes();

  await crearHistorial(req, res);

  assert.equal(res.statusCode, 404);
});

test("crearHistorial rechaza si el medico no es el que atendio el turno", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM turno t/, [[TURNO_ATENDIDO]]]]));

  const req = { body: { id_turno: 1, diagnostico: "Gripe" }, usuario: { id: 999 } };
  const res = mockRes();

  await crearHistorial(req, res);

  assert.equal(res.statusCode, 403);
});

test("crearHistorial rechaza si el turno todavia no fue atendido", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM turno t/, [[{ ...TURNO_ATENDIDO, estado: "confirmado" }]]]])
  );

  const req = { body: { id_turno: 1, diagnostico: "Gripe" }, usuario: { id: 3 } };
  const res = mockRes();

  await crearHistorial(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /atendido/);
});

test("crearHistorial rechaza si ya existe un historial para ese turno", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM turno t/, [[TURNO_ATENDIDO]]],
      [/FROM historial_clinico WHERE id_turno = \?/, [[{ id: 55 }]]],
    ])
  );

  const req = { body: { id_turno: 1, diagnostico: "Gripe" }, usuario: { id: 3 } };
  const res = mockRes();

  await crearHistorial(req, res);

  assert.equal(res.statusCode, 409);
});

test("crearHistorial crea el registro cuando todo es valido", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM turno t/, [[TURNO_ATENDIDO]]],
      [/FROM historial_clinico WHERE id_turno = \?/, [[]]],
      [/INSERT INTO historial_clinico/, [{ insertId: 42 }]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = {
    body: { id_turno: 1, diagnostico: "Gripe", tratamiento: "Reposo" },
    usuario: { id: 3 },
  };
  const res = mockRes();

  await crearHistorial(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.datos.id, 42);
  assert.equal(res.body.datos.id_paciente, 7);
});

test("listarHistorialPaciente rechaza si un paciente consulta el historial de otro", async () => {
  const req = { params: { id_paciente: 8 }, usuario: { rol: "paciente", id: 7 } };
  const res = mockRes();

  await listarHistorialPaciente(req, res);

  assert.equal(res.statusCode, 403);
});

test("listarHistorialPaciente devuelve el propio historial del paciente", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM historial_clinico WHERE id_paciente = \?/, [[{ id: 1, diagnostico: "Gripe" }]]]])
  );

  const req = { params: { id_paciente: 7 }, usuario: { rol: "paciente", id: 7 } };
  const res = mockRes();

  await listarHistorialPaciente(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.length, 1);
});

test("listarHistorialPaciente filtra por medico cuando el rol es medico", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM historial_clinico WHERE id_paciente = \? AND id_medico = \?/, [[{ id: 1, diagnostico: "Gripe" }]]],
    ])
  );

  const req = { params: { id_paciente: 7 }, usuario: { rol: "medico", id: 3 } };
  const res = mockRes();

  await listarHistorialPaciente(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.length, 1);
});
