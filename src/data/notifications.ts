export const turnAlertDelivery: 'in-app' | 'notification' | 'unavailable' = 'unavailable';
export async function requestTurnAlerts() { return false; }
export async function notifyTurn(_title: string, _body: string) {}
