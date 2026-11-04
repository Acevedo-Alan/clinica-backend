import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { crearAgenda, listarAgenda, modificarAgenda, eliminarAgenda } from "../../src/controllers/agendaController.js";
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

  const req = { body: AGENDA_VALIDA, usuario: { rol: "operador", id: 50, id_sede: 1 } };
  const res = mockRes();

  await crearAgenda(req, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.estado, /superpone/);
});

test("crearAgenda rechaza a un operador creando agenda en otra sede", async (t) => {
  const req = { body: AGENDA_VALIDA, usuario: { rol: "operador", id: 50, id_sede: 2 } };
  const res = mockRes();

  await crearAgenda(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.estado, /propia sede/);
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

  const req = { body: AGENDA_VALIDA, usuario: { rol: "operador", id: 50, id_sede: 1 } };
  const res = mockRes();

  await crearAgenda(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.datos.id, 10);
});

test("listarAgenda devuelve el nombre del medico, la especialidad y la sede resueltos", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [
        /FROM agenda a/,
        [
          [
            {
              id: 1,
              id_medico: 3,
              medico_nombre: "Ana",
              medico_apellido: "Lopez",
              id_especialidad: 1,
              especialidad_descripcion: "Traumatologia",
              id_sede: 1,
              sede_nombre: "Sede Centro",
            },
          ],
        ],
      ],
    ])
  );

  const req = { query: { id_especialidad: 1 }, usuario: { rol: "paciente", id: 7 } };
  const res = mockRes();

  await listarAgenda(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos[0].medico_apellido, "Lopez");
  assert.equal(res.body.datos[0].especialidad_descripcion, "Traumatologia");
  assert.equal(res.body.datos[0].sede_nombre, "Sede Centro");
});

test("modificarAgenda rechaza a un operador modificando agenda de otra sede", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM agenda WHERE id = \?/, [[{ id: 5, id_medico: 1, id_sede: 2 }]]]]));

  const req = { params: { id: 5 }, body: AGENDA_VALIDA, usuario: { rol: "operador", id: 50, id_sede: 1 } };
  const res = mockRes();

  await modificarAgenda(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.estado, /propia sede/);
});

test("modificarAgenda rechaza a un operador reasignando la agenda a otra sede", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM agenda WHERE id = \?/, [[{ id: 5, id_medico: 1, id_sede: 1 }]]]]));

  const req = {
    params: { id: 5 },
    body: { ...AGENDA_VALIDA, id_sede: 2 },
    usuario: { rol: "operador", id: 50, id_sede: 1 },
  };
  const res = mockRes();

  await modificarAgenda(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.estado, /propia sede/);
});

test("modificarAgenda rechaza si deja un turno confirmado fuera del nuevo horario", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM agenda WHERE id = \?/, [[{ id: 5, id_medico: 1, id_sede: 1 }]]],
      ...REFERENCIAS_OK,
      [/FROM turno\s+WHERE id_agenda = \? AND estado = 'confirmado'/, [[{ id: 1 }]]],
    ])
  );

  const req = { params: { id: 5 }, body: AGENDA_VALIDA, usuario: { rol: "operador", id: 50, id_sede: 1 } };
  const res = mockRes();

  await modificarAgenda(req, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.estado, /fuera del nuevo rango/);
});

test("modificarAgenda modifica el registro cuando todo es valido", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM agenda WHERE id = \?/, [[{ id: 5, id_medico: 1, id_sede: 1 }]]],
      ...REFERENCIAS_OK,
      [/FROM turno\s+WHERE id_agenda = \? AND estado = 'confirmado'/, [[]]],
      [/FROM agenda WHERE id_medico = \?/, [[]]],
      [/UPDATE agenda/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = { params: { id: 5 }, body: AGENDA_VALIDA, usuario: { rol: "operador", id: 50, id_sede: 1 } };
  const res = mockRes();

  await modificarAgenda(req, res);

  assert.equal(res.statusCode, 200);
});

test("eliminarAgenda rechaza a un operador eliminando agenda de otra sede", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM agenda WHERE id = \?/, [[{ id: 5, id_medico: 1, id_sede: 2 }]]]]));

  const req = { params: { id: 5 }, usuario: { rol: "operador", id: 50, id_sede: 1 } };
  const res = mockRes();

  await eliminarAgenda(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.estado, /propia sede/);
});

test("eliminarAgenda permite a un medico eliminar su propia agenda en cualquiera de sus sedes", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM agenda WHERE id = \?/, [[{ id: 5, id_medico: 3, id_sede: 2 }]]],
      [/FROM turno WHERE id_agenda = \?/, [[]]],
      [/DELETE FROM agenda/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = { params: { id: 5 }, usuario: { rol: "medico", id: 3, id_sede: 1 } };
  const res = mockRes();

  await eliminarAgenda(req, res);

  assert.equal(res.statusCode, 200);
});
