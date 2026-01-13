/**
 * Format reset time for display
 * @param resetTimeISO ISO string of reset time
 * @returns Formatted string like "Resets in 2h 30m" or "Resets in 45m"
 */
export const formatResetTime = (resetTimeISO: string): string => {
  const resetTime = new Date(resetTimeISO);
  const now = new Date();
  const diff = resetTime.getTime() - now.getTime();

  if (diff <= 0) return "Resetting soon";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `Resets in ${hours}h ${minutes}m`;
  } else {
    return `Resets in ${minutes}m`;
  }
};
