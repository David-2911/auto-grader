export const authConfig = {
  refreshLeadTimeSec: 120,
  minImmediateRefreshSec: 30,
  jitterMaxSec: 10,
  maxConsecutiveFailures: 3,
  activityRenewWindowSec: 300,
  storageEventChannel: 'auth:lastRefresh',
};
