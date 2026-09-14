export type StudentCategory = 'Noorani Qaida' | 'Dowra' | 'Nazira' | 'Regular';

/**
 * Determines the category of a student based on mode, section, or className properties.
 * Gracefully falls back to 'Regular' if missing or unrecognized.
 */
export function getStudentCategory(student?: { mode?: string; section?: string; className?: string } | null): StudentCategory {
  if (!student) return 'Regular';
  const modeStr = (student.mode || '').toLowerCase().trim();
  const sectionStr = (student.section || '').toLowerCase().trim();
  const classStr = (student.className || '').toLowerCase().trim();

  if (
    modeStr === 'nazira' ||
    sectionStr.includes('nazira') ||
    classStr.includes('nazira')
  ) {
    return 'Nazira';
  }

  if (
    modeStr.includes('noorani') ||
    sectionStr.includes('noorani') ||
    sectionStr.includes('qaida') ||
    classStr.includes('noorani') ||
    classStr.includes('qaida')
  ) {
    return 'Noorani Qaida';
  }
  if (
    modeStr.includes('dowra') ||
    sectionStr.includes('dowra') ||
    sectionStr.includes('daura') ||
    classStr.includes('dowra') ||
    classStr.includes('daura')
  ) {
    return 'Dowra';
  }
  return 'Regular';
}
