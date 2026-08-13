/**
 * Durable desktop application identity.
 *
 * Electron userData (and therefore IndexedDB) is derived from the product name,
 * not from the version string. Changing `DESKTOP_APP_ID` or
 * `DESKTOP_PRODUCT_NAME` would strand teacher data across upgrades. Do not
 * include the version in these values.
 */

export const DESKTOP_APP_ID = 'com.classroomquizshow.app'
export const DESKTOP_PRODUCT_NAME = 'Classroom Quiz Show'

/**
 * Pre-1.0 REAL MVP version identity lives in package.json (`version`).
 * The Program Orchestrator may select the first public teacher version later
 * by bumping that field; this identity does not need to change.
 */
export function userDataIdentityIncludesVersion(
  appId: string,
  productName: string,
  version: string,
): boolean {
  if (!version) return false
  return appId.includes(version) || productName.includes(version)
}
