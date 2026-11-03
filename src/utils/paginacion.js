const TAMANIO_PAGINA_DEFECTO = 10;
const TAMANIO_PAGINA_MAXIMO = 50;

// Lee page/pageSize de la query string con límites razonables.
export function parsePaginacion(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(
    TAMANIO_PAGINA_MAXIMO,
    Math.max(1, parseInt(query.pageSize, 10) || TAMANIO_PAGINA_DEFECTO)
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}

// Forma uniforme para cualquier listado paginado.
export function datosPaginados(items, total, page, pageSize) {
  return {
    items,
    pagina: page,
    tamanioPagina: pageSize,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / pageSize)),
  };
}
