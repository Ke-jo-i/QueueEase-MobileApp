export type WindowAvailability = { window: string; online: boolean; reason: string };

export const windowOfflineReasons = ['Staff shortage', 'Technical issue', 'Staff unavailable', 'Closed for the day', 'Other'] as const;
