/** Thrown when a pair/unpair operation violates the exactly-2-members rule
 * (already paired, or not currently paired). Caught in the owning service
 * and mapped to a 400 response — never crosses into the controller raw. */
export class PairConflictError extends Error {}
