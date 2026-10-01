export const registrarWindows = ['Window 1 - Registrar', 'Window 2 - Registrar', 'Window 3 - Registrar', 'Window 4 - Registrar'];

const serviceWindows: Record<string, string> = {
  'Certificate of Enrollment': 'Window 3 - Registrar',
  'Certificate of Grades': 'Window 2 - Registrar',
  'Academic Records Request': 'Window 1 - Registrar',
  'Enrollment Concern': 'Window 3 - Registrar',
  'Student Record Update': 'Window 4 - Registrar',
  'Other Registrar Concern': 'Window 3 - Registrar',
};

export function getServiceWindow(service: string) {
  return serviceWindows[service] ?? 'Registrar';
}
