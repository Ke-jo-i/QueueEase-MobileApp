export const turnAlertDelivery: 'in-app' | 'notification' | 'unavailable' = 'in-app';
export async function requestTurnAlerts() { return true; }
export async function notifyTurn(title: string, body: string) { return { title, body }; }
