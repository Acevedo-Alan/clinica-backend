// Helpers compartidos por los tests de controllers/middlewares: un response
// de Express minimo, y un mock de pool.query que resuelve segun el SQL.

export function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

// reglas: lista de [regexSobreElSql, resultadoARetornar]. El primer patron
// que matchee gana. Si ninguno matchea, tira error para detectar queries
// no contempladas en el test.
export function mockQuery(reglas) {
  return async (sql) => {
    for (const [patron, resultado] of reglas) {
      if (patron.test(sql)) return resultado;
    }
    throw new Error(`Query no esperada en el test: ${sql}`);
  };
}
