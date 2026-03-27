exports.isStoreOpen = (store) => {
  if (!store.isActive) return false;

  // Manual override
  if (store.isOpenManual === true) return true;
  if (store.isOpenManual === false) return false;

  if (!store.openTime || !store.lastOrderTime) return false;

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

  // ✅ Handle normal + overnight stores
  if (store.openTime < store.lastOrderTime) {
    // same day (08:00 → 22:00)
    return currentTime >= store.openTime && currentTime <= store.lastOrderTime;
  } else {
    // overnight (20:00 → 02:00)
    return (
      currentTime >= store.openTime ||
      currentTime <= store.lastOrderTime
    );
  }
};