import * as migration_20260721_192200_initial from './20260721_192200_initial'

export const migrations = [
  {
    up: migration_20260721_192200_initial.up,
    down: migration_20260721_192200_initial.down,
    name: '20260721_192200_initial',
  },
]
