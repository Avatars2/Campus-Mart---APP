/**
 * Helper to determine if an item was listed/added within the last 24 hours.
 * @param {object} item - Item object with `createdAt` or `is_newly_added`
 * @returns {boolean}
 */
export const isItemNewlyAdded = (item) => {
  if (!item) return false;
  if (typeof item.is_newly_added === 'boolean') {
    return item.is_newly_added;
  }
  const dateVal = item.createdAt || item.created_at;
  if (!dateVal) return false;
  const createdMs = new Date(dateVal).getTime();
  if (isNaN(createdMs)) return false;
  const diff = Date.now() - createdMs;
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
};

