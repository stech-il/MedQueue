/** תבניות מסך תצוגה */

export const DISPLAY_TEMPLATES = [
  {
    value: 'board',
    title: 'לוח מלא',
    desc: 'עמודות תורים בצדדים + מרכז (שקופיות / תמונה / סרטון)',
  },
  {
    value: 'classic',
    title: 'רשת כרטיסים',
    desc: 'כרטיס לכל חדר — התצוגה המקורית',
  },
];

export function getDisplayTemplate(settings) {
  const t = settings?.display_template || 'board';
  return t === 'classic' ? 'classic' : 'board';
}
