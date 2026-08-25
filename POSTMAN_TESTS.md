# Scripts de Tests para Postman

## Script comun: respuesta uniforme

Usar en cualquier request. Permite `datos: null` en errores y exige exactamente las tres propiedades del contrato.

```javascript
pm.test("La respuesta tiene formato uniforme", function () {
  const body = pm.response.json();
  pm.expect(body).to.be.an("object");
  pm.expect(Object.keys(body).sort()).to.eql(["codigo", "datos", "estado"]);
  pm.expect(body.codigo).to.be.a("number");
  pm.expect(body.estado).to.be.a("string");
  pm.expect(body.codigo).to.eql(pm.response.code);
});
```

## Exito 200

```javascript
pm.test("HTTP 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Respuesta exitosa con datos", function () {
  const body = pm.response.json();
  pm.expect(body.estado).to.eql("ok");
  pm.expect(body).to.have.property("datos");
});
```

## Exito 201 y guardar ID

```javascript
pm.test("HTTP 201", function () {
  pm.response.to.have.status(201);
});

pm.test("Alta creada con datos e ID", function () {
  const body = pm.response.json();
  pm.expect(body.estado).to.eql("ok");
  pm.expect(body.datos).to.be.an("object");
  pm.expect(body.datos.id).to.be.a("number");
  pm.collectionVariables.set("recurso_id", body.datos.id);
});
```

## Error 400 o 409 por regla de negocio

Usar en validaciones de body o eliminaciones con dependencias.

```javascript
pm.test("HTTP 400 o 409 controlado", function () {
  pm.expect([400, 409]).to.include(pm.response.code);
});

pm.test("Error uniforme sin datos", function () {
  const body = pm.response.json();
  pm.expect(body.estado).to.not.eql("ok");
  pm.expect(body.datos).to.eql(null);
});
```

## Acceso denegado 403

Usar con `token_paciente`, `token_medico` en endpoints administrativos o cualquier token sin el rol requerido.

```javascript
pm.test("HTTP 403", function () {
  pm.response.to.have.status(403);
});

pm.test("Permiso denegado con respuesta uniforme", function () {
  const body = pm.response.json();
  pm.expect(body.codigo).to.eql(403);
  pm.expect(body.estado).to.be.a("string");
  pm.expect(body.datos).to.eql(null);
});
```

## DELETE con dependencias

Usar para una sede con usuarios o agenda, una especialidad con `medico_especialidad` y una cobertura usada por usuarios. Se espera `409` y nunca `500`.

```javascript
pm.test("Dependencia rechazada sin HTTP 500", function () {
  pm.response.to.have.status(409);
  pm.expect(pm.response.code).to.not.eql(500);
});

pm.test("La dependencia devuelve error uniforme", function () {
  const body = pm.response.json();
  pm.expect(Object.keys(body).sort()).to.eql(["codigo", "datos", "estado"]);
  pm.expect(body.codigo).to.eql(409);
  pm.expect(body.estado).to.be.a("string");
  pm.expect(body.datos).to.eql(null);
});
```

## Agenda: segundo rango del mismo dia

Colocar en los dos requests de creacion; ambos deben responder `201`, aunque compartan medico y fecha.

```javascript
pm.test("Se permite crear el rango horario", function () {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.estado).to.eql("ok");
  pm.expect(body.datos.id_medico).to.eql(3);
  pm.expect(body.datos.fecha).to.eql("2026-09-01");
});
```

## Agenda: filtros

Para `GET /agenda?id_medico=3&id_sede=1&fecha=2026-09-01`.

```javascript
pm.test("Listado filtrado correctamente", function () {
  pm.response.to.have.status(200);
  const body = pm.response.json();
  pm.expect(body.estado).to.eql("ok");
  pm.expect(body.datos).to.be.an("array");
  body.datos.forEach(function (item) {
    pm.expect(Number(item.id_medico)).to.eql(3);
    pm.expect(Number(item.id_sede)).to.eql(1);
    pm.expect(String(item.fecha).slice(0, 10)).to.eql("2026-09-01");
  });
});
```

## Agenda: medico solo ve o modifica la propia

Para un request con `token_medico` y un `id_medico` distinto al del token, o para una agenda perteneciente a otro medico.

```javascript
pm.test("Medico no puede operar agenda ajena", function () {
  pm.response.to.have.status(403);
  const body = pm.response.json();
  pm.expect(body.codigo).to.eql(403);
  pm.expect(body.datos).to.eql(null);
});
```

## Validacion de referencias de agenda

Usar con un medico, especialidad o sede inexistente. Confirma que la FK no se expone como error 500.

```javascript
pm.test("Referencia de agenda invalida controlada", function () {
  pm.expect([400, 409]).to.include(pm.response.code);
  pm.expect(pm.response.code).to.not.eql(500);
  const body = pm.response.json();
  pm.expect(body.codigo).to.eql(pm.response.code);
  pm.expect(body.datos).to.eql(null);
});
```
