import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { listarUsuarios, obtenerUsuario, crearUsuario, modificarUsuario } from "../../src/controllers/usuarioController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

const OPERADOR_VALIDO = {
  nombre: "Lucia",
  apellido: "Gomez",
  dni: "30222333",
  email: "lucia@mail.com",
  password: "secreta123",
  fecha_nacimiento: "1985-05-05",
  rol: "operador",
  id_sede: 1,
};

const MEDICO_VALIDO = {
  ...OPERADOR_VALIDO,
  dni: "30222444",
  email: "medico@mail.com",
  rol: "medico",
  especialidades: [1, 2],
};

// Reglas comunes de asignarEspecialidades: no se destructura el resultado,
// cualquier valor sirve.
const ESPECIALIDADES_ASIGNABLES = [
  [/DELETE FROM medico_especialidad/, [{}]],
  [/INSERT INTO medico_especialidad/, [{}]],
];

test("crearUsuario rechaza si faltan datos obligatorios", async () => {
  const req = { body: { nombre: "Lucia" }, usuario: { id: 1 } };
  const res = mockRes();

  await crearUsuario(req, res);

  assert.equal(res.statusCode, 400);
});

test("crearUsuario rechaza un rol no gestionable", async () => {
  const req = { body: { ...OPERADOR_VALIDO, rol: "paciente" }, usuario: { id: 1 } };
  const res = mockRes();

  await crearUsuario(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /El rol debe ser uno de/);
});

test("crearUsuario rechaza operador sin id_sede", async () => {
  const req = { body: { ...OPERADOR_VALIDO, id_sede: undefined }, usuario: { id: 1 } };
  const res = mockRes();

  await crearUsuario(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /sede/);
});

test("crearUsuario rechaza si la sede indicada no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM sede WHERE id = \?/, [[]]]]));

  const req = { body: OPERADOR_VALIDO, usuario: { id: 1 } };
  const res = mockRes();

  await crearUsuario(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.estado, "La sede indicada no existe");
});

test("crearUsuario rechaza medico sin especialidades", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM sede WHERE id = \?/, [[{ id: 1 }]]]]));

  const req = { body: { ...MEDICO_VALIDO, especialidades: [] }, usuario: { id: 1 } };
  const res = mockRes();

  await crearUsuario(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /especialidad/);
});

test("crearUsuario rechaza dni o email duplicado", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM sede WHERE id = \?/, [[{ id: 1 }]]],
      [/FROM usuario WHERE dni = \? OR email = \?/, [[{ id: 9 }]]],
    ])
  );

  const req = { body: OPERADOR_VALIDO, usuario: { id: 1 } };
  const res = mockRes();

  await crearUsuario(req, res);

  assert.equal(res.statusCode, 409);
});

test("crearUsuario crea un operador valido", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM sede WHERE id = \?/, [[{ id: 1 }]]],
      [/FROM usuario WHERE dni = \? OR email = \?/, [[]]],
      [/INSERT INTO usuario/, [{ insertId: 20 }]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = { body: OPERADOR_VALIDO, usuario: { id: 1 } };
  const res = mockRes();

  await crearUsuario(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.datos.rol, "operador");
  assert.deepEqual(res.body.datos.especialidades, []);
});

test("crearUsuario crea un medico y le asigna especialidades", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM sede WHERE id = \?/, [[{ id: 1 }]]],
      [/FROM especialidad WHERE id IN/, [[{ id: 1 }, { id: 2 }]]],
      [/FROM usuario WHERE dni = \? OR email = \?/, [[]]],
      [/INSERT INTO usuario/, [{ insertId: 21 }]],
      ...ESPECIALIDADES_ASIGNABLES,
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = { body: MEDICO_VALIDO, usuario: { id: 1 } };
  const res = mockRes();

  await crearUsuario(req, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body.datos.especialidades, [1, 2]);
});

test("obtenerUsuario responde 404 si no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM usuario WHERE id = \?/, [[]]]]));

  const req = { params: { id: 99 } };
  const res = mockRes();

  await obtenerUsuario(req, res);

  assert.equal(res.statusCode, 404);
});

test("obtenerUsuario incluye especialidades si el rol es medico", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/^SELECT .* FROM usuario WHERE id = \?/, [[{ id: 3, rol: "medico" }]]],
      [/FROM medico_especialidad WHERE id_medico = \?/, [[{ id_especialidad: 1 }, { id_especialidad: 4 }]]],
    ])
  );

  const req = { params: { id: 3 } };
  const res = mockRes();

  await obtenerUsuario(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.datos.especialidades, [1, 4]);
});

test("modificarUsuario rechaza si el usuario no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM usuario WHERE id = \?$/, [[]]]]));

  const req = {
    params: { id: 1 },
    body: { nombre: "Lucia", apellido: "Gomez", email: "lucia@mail.com", fecha_nacimiento: "1985-05-05" },
    usuario: { id: 1 },
  };
  const res = mockRes();

  await modificarUsuario(req, res);

  assert.equal(res.statusCode, 404);
});

test("modificarUsuario rechaza si el email ya lo usa otro usuario", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT \* FROM usuario WHERE id = \?/, [[{ id: 1, rol: "paciente" }]]],
      [/FROM usuario WHERE email = \? AND id <> \?/, [[{ id: 2 }]]],
    ])
  );

  const req = {
    params: { id: 1 },
    body: { nombre: "Lucia", apellido: "Gomez", email: "ocupado@mail.com", fecha_nacimiento: "1985-05-05" },
    usuario: { id: 1 },
  };
  const res = mockRes();

  await modificarUsuario(req, res);

  assert.equal(res.statusCode, 409);
});

test("modificarUsuario rechaza operador sin sede", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT \* FROM usuario WHERE id = \?/, [[{ id: 1, rol: "operador", id_sede: 1 }]]],
      [/FROM usuario WHERE email = \? AND id <> \?/, [[]]],
    ])
  );

  const req = {
    params: { id: 1 },
    body: { nombre: "Lucia", apellido: "Gomez", email: "lucia@mail.com", fecha_nacimiento: "1985-05-05" },
    usuario: { id: 1 },
  };
  const res = mockRes();

  await modificarUsuario(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /sede/);
});

test("modificarUsuario rechaza paciente sin cobertura", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT \* FROM usuario WHERE id = \?/, [[{ id: 7, rol: "paciente", id_cobertura: 1 }]]],
      [/FROM usuario WHERE email = \? AND id <> \?/, [[]]],
    ])
  );

  const req = {
    params: { id: 7 },
    body: { nombre: "Juana", apellido: "Perez", email: "juana@mail.com", fecha_nacimiento: "1990-01-01" },
    usuario: { id: 1 },
  };
  const res = mockRes();

  await modificarUsuario(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /cobertura/);
});

test("modificarUsuario actualiza un medico y reasigna especialidades", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT \* FROM usuario WHERE id = \?/, [[{ id: 3, rol: "medico", id_sede: 1 }]]],
      [/FROM usuario WHERE email = \? AND id <> \?/, [[]]],
      [/FROM sede WHERE id = \?/, [[{ id: 1 }]]],
      [/FROM especialidad WHERE id IN/, [[{ id: 2 }]]],
      ...ESPECIALIDADES_ASIGNABLES,
      [/UPDATE usuario/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = {
    params: { id: 3 },
    body: {
      nombre: "Carlos",
      apellido: "Diaz",
      email: "carlos@mail.com",
      fecha_nacimiento: "1980-01-01",
      id_sede: 1,
      especialidades: [2],
    },
    usuario: { id: 1 },
  };
  const res = mockRes();

  await modificarUsuario(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.datos.especialidades, [2]);
});
