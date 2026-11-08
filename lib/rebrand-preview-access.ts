/**
 * The fixture preview is a development capture harness.
 * Release and export bundles set __DEV__ to false.
 */
export function canOpenRebrandPreview(
    isDev: boolean = typeof __DEV__ === 'boolean' ? __DEV__ : false,
): boolean {
    return isDev === true;
}
