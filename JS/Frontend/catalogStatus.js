// Vista de estado de la carga del catálogo para la interfaz.
export function getCatalogStatusView(status) {
    if (status === 'loading') {
        return { visible: true, status: 'loading', message: 'Cargando catálogo...', retryable: false };
    }
    if (status === 'stale') {
        return {
            visible: true,
            status: 'stale',
            message: 'No se pudo actualizar el catálogo. Se muestran datos guardados que podrían estar desactualizados.',
            retryable: true
        };
    }
    if (status === 'error') {
        return {
            visible: true,
            status: 'error',
            message: 'No se pudo cargar el catálogo. Comprueba tu conexión y vuelve a intentarlo.',
            retryable: true
        };
    }
    return { visible: false, status: 'idle', message: '', retryable: false };
}
