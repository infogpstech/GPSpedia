/**
 * Inicia la validación comunitaria al abrir el modal, sin depender de eventos de imagen.
 * Evita ejecuciones duplicadas y descarta resultados tardíos si cambia el vehículo o se cierra el modal.
 */
export async function startValidationBannerForModal({ item, modalElement, detailContainer, checkEligibility, showBanner }) {
    if (!item || !modalElement || !detailContainer ||
        typeof checkEligibility !== "function" || typeof showBanner !== "function") return false;
    const vehicleId = String(item.id || "");
    if (!vehicleId || modalElement.dataset.modalType !== "corte" ||
        String(modalElement.dataset.vehicleId || "") !== vehicleId) return false;
    if (modalElement.dataset.validationBannerRequestedVehicleId === vehicleId) return false;
    modalElement.dataset.validationBannerRequestedVehicleId = vehicleId;
    try {
        const result = await checkEligibility(item);
        const stillCurrent = modalElement.dataset.modalType === "corte" &&
            String(modalElement.dataset.vehicleId || "") === vehicleId &&
            modalElement.classList.contains("visible") &&
            document.getElementById("detalleCompleto") === detailContainer &&
            detailContainer.isConnected;
        if (!stillCurrent || !result || !result.eligible) return false;
        showBanner(item, Boolean(result.isOldModel));
        return true;
    } catch (error) {
        if (modalElement.dataset.validationBannerRequestedVehicleId === vehicleId) {
            delete modalElement.dataset.validationBannerRequestedVehicleId;
        }
        throw error;
    }
}
