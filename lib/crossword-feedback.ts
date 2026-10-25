/** TUB-299 toast copy for a wrong Check (the toast's tag reads "MIND THE GAP"). */
export function wrongLettersMessage(count: number): string {
    return count === 1 ? "1 letter isn't right yet" : `${count} letters aren't right yet`;
}
