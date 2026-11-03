import { test } from "node:test";
import assert from "node:assert/strict";

import { parsePaginacion, datosPaginados } from "../../src/utils/paginacion.js";

test("parsePaginacion usa page=1 y pageSize=10 por defecto", () => {
  const { page, pageSize, offset } = parsePaginacion({});
  assert.equal(page, 1);
  assert.equal(pageSize, 10);
  assert.equal(offset, 0);
});

test("parsePaginacion calcula el offset a partir de page y pageSize", () => {
  const { page, pageSize, offset } = parsePaginacion({ page: "3", pageSize: "20" });
  assert.equal(page, 3);
  assert.equal(pageSize, 20);
  assert.equal(offset, 40);
});

test("parsePaginacion no permite page menor a 1", () => {
  const { page, offset } = parsePaginacion({ page: "0" });
  assert.equal(page, 1);
  assert.equal(offset, 0);
});

test("parsePaginacion limita pageSize al maximo permitido", () => {
  const { pageSize } = parsePaginacion({ pageSize: "500" });
  assert.equal(pageSize, 50);
});

test("parsePaginacion ignora valores no numericos y usa los valores por defecto", () => {
  const { page, pageSize } = parsePaginacion({ page: "abc", pageSize: "xyz" });
  assert.equal(page, 1);
  assert.equal(pageSize, 10);
});

test("datosPaginados arma la forma uniforme de respuesta paginada", () => {
  const items = [{ id: 1 }, { id: 2 }];
  const resultado = datosPaginados(items, 25, 2, 10);
  assert.deepEqual(resultado, {
    items,
    pagina: 2,
    tamanioPagina: 10,
    total: 25,
    totalPaginas: 3,
  });
});

test("datosPaginados devuelve al menos 1 pagina incluso sin resultados", () => {
  const resultado = datosPaginados([], 0, 1, 10);
  assert.equal(resultado.totalPaginas, 1);
});
