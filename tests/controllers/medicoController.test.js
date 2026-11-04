import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { listarMedicos } from "../../src/controllers/medicoController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

test("listarMedicos devuelve [] sin tocar especialidades si no hay medicos que matcheen", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM usuario WHERE/, [[]]]]));

  const req = { query: { id_especialidad: 1 } };
  const res = mockRes();

  await listarMedicos(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.datos, []);
});

test("listarMedicos arma nombre/apellido/especialidades por medico", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM usuario WHERE/, [[{ id: 3, nombre: "Ana", apellido: "Lopez" }, { id: 4, nombre: "Juan", apellido: "Diaz" }]]],
      [
        /FROM medico_especialidad me/,
        [
          [
            { id_medico: 3, id: 1, descripcion: "Traumatologia" },
            { id_medico: 3, id: 2, descripcion: "Cardiologia" },
            { id_medico: 4, id: 1, descripcion: "Traumatologia" },
          ],
        ],
      ],
    ])
  );

  const req = { query: {} };
  const res = mockRes();

  await listarMedicos(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.length, 2);
  assert.deepEqual(res.body.datos[0].especialidades, [
    { id: 1, descripcion: "Traumatologia" },
    { id: 2, descripcion: "Cardiologia" },
  ]);
  assert.deepEqual(res.body.datos[1].especialidades, [{ id: 1, descripcion: "Traumatologia" }]);
  assert.equal(res.body.datos[0].dni, undefined);
});

test("listarMedicos filtra por id_especialidad e id_sede combinados", async (t) => {
  const consultas = [];
  t.mock.method(pool, "query", async (sql, valores) => {
    consultas.push({ sql, valores });
    if (/FROM usuario WHERE/.test(sql)) return [[]];
    return [[]];
  });

  const req = { query: { id_especialidad: "1", id_sede: "2" } };
  const res = mockRes();

  await listarMedicos(req, res);

  assert.equal(res.statusCode, 200);
  const consultaUsuario = consultas.find(({ sql }) => /FROM usuario WHERE/.test(sql));
  assert.match(consultaUsuario.sql, /medico_especialidad WHERE id_especialidad/);
  assert.match(consultaUsuario.sql, /FROM agenda WHERE id_sede/);
  assert.deepEqual(consultaUsuario.valores, ["1", "2"]);
});
