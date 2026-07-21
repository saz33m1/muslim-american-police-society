// No migrations yet. Generate the initial one once the schema settles:
//
//   npm run payload -- migrate:create initial     (under Node 22)
//
// Production runs with auto-sync off, so it cannot deploy until this array has
// a migration covering the current config. Local dev auto-syncs and hides that;
// CI's migration guard is what catches the drift.
export const migrations = []
