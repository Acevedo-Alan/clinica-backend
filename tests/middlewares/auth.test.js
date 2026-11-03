import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { verificarToken, verificarRol } from "../../src/middlewares/auth.js";
import { mockRes } from "../helpers/http.js";

test("verificarToken responde 401 si no hay header Authorization", () => {
  const req = { headers: {} };
  const res = mockRes();
  let nextLlamado = false;

  verificarToken(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.estado, "Token no provisto");
  assert.equal(nextLlamado, false);
});

test("verificarToken responde 401 si el header no empieza con 'Bearer '", () => {
  const req = { headers: { authorization: "Token abc" } };
  const res = mockRes();

  verificarToken(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.estado, "Token no provisto");
});

test("verificarToken responde 401 si jwt.verify rechaza el token", (t) => {
  t.mock.method(jwt, "verify", () => {
    throw new Error("jwt expired");
  });

  const req = { headers: { authorization: "Bearer token-vencido" } };
  const res = mockRes();

  verificarToken(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.estado, "Token inválido o vencido");
});

test("verificarToken setea req.usuario y llama a next() con un token valido", (t) => {
  const payload = { id: 5, rol: "medico", id_sede: 1 };
  t.mock.method(jwt, "verify", () => payload);

  const req = { headers: { authorization: "Bearer token-valido" } };
  const res = mockRes();
  let nextLlamado = false;

  verificarToken(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(nextLlamado, true);
  assert.deepEqual(req.usuario, payload);
  assert.equal(res.statusCode, null);
});

test("verificarRol responde 401 si no hay req.usuario", () => {
  const req = {};
  const res = mockRes();

  verificarRol("administrador")(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.estado, "No autenticado");
});

test("verificarRol responde 403 si el rol no esta permitido", () => {
  const req = { usuario: { rol: "paciente" } };
  const res = mockRes();

  verificarRol("administrador", "operador")(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.estado, "No tiene permisos para acceder a este recurso");
});

test("verificarRol llama a next() si el rol esta permitido", () => {
  const req = { usuario: { rol: "medico" } };
  const res = mockRes();
  let nextLlamado = false;

  verificarRol("medico", "operador")(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(nextLlamado, true);
  assert.equal(res.statusCode, null);
});
