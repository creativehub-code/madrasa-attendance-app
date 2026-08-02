export type StudentCategory = 'Noorani Qaida' | 'Dowra' | 'Regular';

/**
 * Determines the category of a student based on section or className properties.
 * Gracefully falls back to 'Regular' if section/className is missing or unrecognized.
 */
export function getStudentCategory(student?: { section?: string; className?: string } | null): StudentCategory {
  if (!student) return 'Regular';
  const sectionStr = (student.section || '').toLowerCase().trim();
  const classStr = (student.className || '').toLowerCase().trim();

  if (
    sectionStr.includes('noorani') ||
    sectionStr.includes('qaida') ||
    classStr.includes('noorani') ||
    classStr.includes('qaida')
  ) {
    return 'Noorani Qaida';
  }
  if (
    sectionStr.includes('dowra') ||
    sectionStr.includes('daura') ||
    classStr.includes('dowra') ||
    classStr.includes('daura')
  ) {
    return 'Dowra';
  }
  return 'Regular';
}
