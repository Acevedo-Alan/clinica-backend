import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import pool from "../../src/database/db.js";
import { registro, login, actualizarPerfil, cambiarPassword } from "../../src/controllers/authController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

const REGISTRO_VALIDO = {
  nombre: "Juana",
  apellido: "Perez",
  dni: "30111222",
  email: "juana@mail.com",
  password: "secreta123",
  fecha_nacimiento: "1990-01-01",
  id_cobertura: 1,
};

test("registro rechaza si faltan datos obligatorios", async () => {
  const req = { body: { nombre: "Juana" } };
  const res = mockRes();

  await registro(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /Faltan datos obligatorios/);
});

test("registro rechaza si la cobertura no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM cobertura WHERE id = \?/, [[]]]]));

  const req = { body: REGISTRO_VALIDO };
  const res = mockRes();

  await registro(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.estado, "La cobertura seleccionada no existe");
});

test("registro rechaza si el DNI o el email ya existen", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM cobertura WHERE id = \?/, [[{ id: 1 }]]],
      [/FROM usuario WHERE dni = \? OR email = \?/, [[{ id: 5 }]]],
    ])
  );

  const req = { body: REGISTRO_VALIDO };
  const res = mockRes();

  await registro(req, res);

  assert.equal(res.statusCode, 409);
  assert.match(res.body.estado, /Ya existe un usuario/);
});

test("registro crea el paciente cuando todo es valido", async (t) => {
  t.mock.method(bcrypt, "hash", async () => "hash-falso");
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM cobertura WHERE id = \?/, [[{ id: 1 }]]],
      [/FROM usuario WHERE dni = \? OR email = \?/, [[]]],
      [/INSERT INTO usuario/, [{ insertId: 10 }]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = { body: REGISTRO_VALIDO };
  const res = mockRes();

  await registro(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.datos.id, 10);
  assert.equal(res.body.datos.rol, "paciente");
});

test("login rechaza si faltan dni o password", async () => {
  const req = { body: { dni: "30111222" } };
  const res = mockRes();

  await login(req, res);

  assert.equal(res.statusCode, 400);
});

test("login rechaza credenciales invalidas si el usuario no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM usuario WHERE dni = \?/, [[]]]]));

  const req = { body: { dni: "30111222", password: "secreta123" } };
  const res = mockRes();

  await login(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.estado, "Credenciales inválidas");
});

test("login rechaza credenciales invalidas si la contraseña no coincide", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM usuario WHERE dni = \?/, [[{ id: 1, password: "hash-real" }]]]])
  );
  t.mock.method(bcrypt, "compare", async () => false);

  const req = { body: { dni: "30111222", password: "incorrecta" } };
  const res = mockRes();

  await login(req, res);

  assert.equal(res.statusCode, 401);
});

test("login responde con token cuando las credenciales son correctas", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [
        /FROM usuario WHERE dni = \?/,
        [[{ id: 1, nombre: "Juana", apellido: "Perez", rol: "paciente", email: "juana@mail.com", password: "hash-real", id_sede: null }]],
      ],
    ])
  );
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(jwt, "sign", () => "token-falso");

  const req = { body: { dni: "30111222", password: "secreta123" } };
  const res = mockRes();

  await login(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.token, "token-falso");
  assert.equal(res.body.datos.usuario.rol, "paciente");
});

test("actualizarPerfil rechaza si el email ya pertenece a otro usuario", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM usuario WHERE email = \? AND id <> \?/, [[{ id: 99 }]]]])
  );

  const req = {
    usuario: { id: 1 },
    body: { nombre: "Juana", apellido: "Perez", email: "ocupado@mail.com", fecha_nacimiento: "1990-01-01" },
  };
  const res = mockRes();

  await actualizarPerfil(req, res);

  assert.equal(res.statusCode, 409);
});

test("actualizarPerfil actualiza los datos propios cuando son validos", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM usuario WHERE email = \? AND id <> \?/, [[]]],
      [/UPDATE usuario/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
      [/SELECT id, apellido, nombre, fecha_nacimiento, rol, email, telefono, dni, id_sede, id_cobertura FROM usuario WHERE id = \?/, [[{ id: 1, nombre: "Juana" }]]],
    ])
  );

  const req = {
    usuario: { id: 1 },
    body: { nombre: "Juana", apellido: "Perez", email: "juana@mail.com", fecha_nacimiento: "1990-01-01" },
  };
  const res = mockRes();

  await actualizarPerfil(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.id, 1);
});

test("cambiarPassword rechaza una contraseña nueva demasiado corta", async () => {
  const req = { usuario: { id: 1 }, body: { passwordActual: "vieja1234", passwordNueva: "corta" } };
  const res = mockRes();

  await cambiarPassword(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /al menos 8 caracteres/);
});

test("cambiarPassword rechaza si la contraseña actual no coincide", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM usuario WHERE id = \?/, [[{ password: "hash-real" }]]]]));
  t.mock.method(bcrypt, "compare", async () => false);

  const req = { usuario: { id: 1 }, body: { passwordActual: "incorrecta", passwordNueva: "nuevaPassword1" } };
  const res = mockRes();

  await cambiarPassword(req, res);

  assert.equal(res.statusCode, 401);
});

test("cambiarPassword actualiza la contraseña cuando la actual es correcta", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM usuario WHERE id = \?/, [[{ password: "hash-real" }]]],
      [/UPDATE usuario SET password/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );
  t.mock.method(bcrypt, "compare", async () => true);
  t.mock.method(bcrypt, "hash", async () => "hash-nuevo");

  const req = { usuario: { id: 1 }, body: { passwordActual: "vieja1234", passwordNueva: "nuevaPassword1" } };
  const res = mockRes();

  await cambiarPassword(req, res);

  assert.equal(res.statusCode, 200);
});
