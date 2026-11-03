import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { crearAgenda } from "../../src/controllers/agendaController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

const AGENDA_VALIDA = {
  hora_entrada: "15:00",
  hora_salida: "20:00",
  fecha: "2999-01-01",
  id_medico: 1,
  id_especialidad: 1,
  id_sede: 1,
};

const REFERENCIAS_OK = [
  [/FROM usuario WHERE id = \? AND rol = 'medico'/, [[{ id: 1 }]]],
  [/FROM especialidad WHERE id = \?/, [[{ id: 1 }]]],
  [/FROM sede WHERE id = \?/, [[{ id: 1 }]]],
];

// Estas dos validaciones cortan antes de tocar la base, así que no hace falta
// mockear pool.query ni req.usuario.

test("crearAgenda rechaza hora_entrada >= hora_salida", async () => {
  const req = {
    body: {
      hora_entrada: "20:00",
      hora_salida: "15:00",
      fecha: "2999-01-01",
      id_medico: 1,
      id_especialidad: 1,
      id_sede: 1,
    },
  };
  const res = mockRes();

  await crearAgenda(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.estado, "La hora de entrada debe ser anterior a la hora de salida");
});

test("crearAgenda rechaza una fecha anterior a hoy", async () => {
  const req = {
    body: {
      hora_entrada: "15:00",
      hora_salida: "20:00",
      fecha: "2000-01-01",
      id_medico: 1,
      id_especialidad: 1,
      id_sede: 1,
    },
  };
  const res = mockRes();

  await crearAgenda(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.estado, "No se puede crear un registro de agenda con fecha pasada");
});

test("crearAgenda rechaza si faltan datos obligatorios", async () => {
  const req = { body: { fecha: "2999-01-01" } };
  const res = mockRes();

  await crearAgenda(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /Faltan datos obligatorios/);
});

test("crearAgenda rechaza superposicion con otro bloque del mismo medico", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([...REFERENCIAS_OK, [/FROM agenda WHERE id_medico = \?/, [[{ id: 99 }]]]])
  );

  const req = { body: AGENDA_VALIDA, usuario: { rol: "operador", id: 50 } };
  const res = mockRes();

  await crearAgenda(req, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.estado, /superpone/);
});

test("crearAgenda crea el registro cuando todo es valido", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      ...REFERENCIAS_OK,
      [/FROM agenda WHERE id_medico = \?/, [[]]],
      [/INSERT INTO agenda/, [{ insertId: 10 }]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = { body: AGENDA_VALIDA, usuario: { rol: "operador", id: 50 } };
  const res = mockRes();

  await crearAgenda(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.datos.id, 10);
});
