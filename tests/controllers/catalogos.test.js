// Tests para la validacion de nombre/descripcion duplicados en los catalogos
// simples (cobertura, especialidad, sede): ninguno tiene UNIQUE en la base,
// asi que la unica barrera contra duplicados es esta validacion en el controller.
import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { crearCobertura, modificarCobertura } from "../../src/controllers/coberturaController.js";
import { crearEspecialidad, modificarEspecialidad } from "../../src/controllers/especialidadController.js";
import { crearSede, modificarSede } from "../../src/controllers/sedeController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

test("crearCobertura rechaza un nombre que ya existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM cobertura WHERE nombre = \?/, [[{ id: 1 }]]]]));

  const req = { body: { nombre: "Jerarquicos" }, usuario: { id: 1 } };
  const res = mockRes();

  await crearCobertura(req, res);

  assert.equal(res.statusCode, 409);
});

test("modificarCobertura rechaza un nombre que ya usa otra cobertura", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT id FROM cobertura WHERE id = \?$/, [[{ id: 2 }]]],
      [/FROM cobertura WHERE nombre = \? AND id <> \?/, [[{ id: 1 }]]],
    ])
  );

  const req = { params: { id: 2 }, body: { nombre: "Jerarquicos" }, usuario: { id: 1 } };
  const res = mockRes();

  await modificarCobertura(req, res);

  assert.equal(res.statusCode, 409);
});

test("crearEspecialidad rechaza una descripcion que ya existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM especialidad WHERE descripcion = \?/, [[{ id: 1 }]]]]));

  const req = { body: { descripcion: "Traumatologia" }, usuario: { id: 1 } };
  const res = mockRes();

  await crearEspecialidad(req, res);

  assert.equal(res.statusCode, 409);
});

test("modificarEspecialidad rechaza una descripcion que ya usa otra especialidad", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT id FROM especialidad WHERE id = \?$/, [[{ id: 2 }]]],
      [/FROM especialidad WHERE descripcion = \? AND id <> \?/, [[{ id: 1 }]]],
    ])
  );

  const req = { params: { id: 2 }, body: { descripcion: "Traumatologia" }, usuario: { id: 1 } };
  const res = mockRes();

  await modificarEspecialidad(req, res);

  assert.equal(res.statusCode, 409);
});

test("crearSede rechaza un nombre que ya existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM sede WHERE nombre = \?/, [[{ id: 1 }]]]]));

  const req = {
    body: { nombre: "Sede Centro", direccion: "San Martín 123", telefono: "3424000001" },
    usuario: { id: 1 },
  };
  const res = mockRes();

  await crearSede(req, res);

  assert.equal(res.statusCode, 409);
});

test("modificarSede rechaza un nombre que ya usa otra sede", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT id FROM sede WHERE id = \?$/, [[{ id: 2 }]]],
      [/FROM sede WHERE nombre = \? AND id <> \?/, [[{ id: 1 }]]],
    ])
  );

  const req = {
    params: { id: 2 },
    body: { nombre: "Sede Centro", direccion: "Otra direccion", telefono: "3424000002" },
    usuario: { id: 1 },
  };
  const res = mockRes();

  await modificarSede(req, res);

  assert.equal(res.statusCode, 409);
});
