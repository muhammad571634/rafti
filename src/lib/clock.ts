/** A time on the phone's own clock style: "21:30", or "9:30 PM" where the phone reads 12-hour. */
export function clockText(d: Date, uses24Hour: boolean, locale: string) {
  if (!uses24Hour) return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
