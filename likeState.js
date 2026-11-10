export function applyConfirmedLikeState(currentState, vehicleId, corteIndex, response) {
    const state = currentState && typeof currentState === "object" ? currentState : {};
    const likeKey = String(vehicleId) + "-" + String(corteIndex);
    const previousLikes = Array.isArray(state.likedCortes) ? state.likedCortes : [];
    const likedCortes = previousLikes.includes(likeKey) ? previousLikes : [...previousLikes, likeKey];
    const catalogData = state.catalogData && typeof state.catalogData === "object" ? state.catalogData : {};
    const cortes = Array.isArray(catalogData.cortes) ? catalogData.cortes : [];
    const countKey = "utilCorte" + String(corteIndex);
    const likeCount = response && response.likeCount;
    const nextCortes = Number.isSafeInteger(likeCount) && likeCount >= 0
        ? cortes.map(vehicle => String(vehicle && vehicle.id) === String(vehicleId)
            ? { ...vehicle, [countKey]: likeCount }
            : vehicle)
        : cortes;
    return { likedCortes, catalogData: { ...catalogData, cortes: nextCortes } };
}
