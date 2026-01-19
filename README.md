# codex-config

Personal Codex config with a small sync harness that is safe to share with colleagues.

## What this does
- Tracks a shared Codex config in `config/config.toml`.
- Syncs it to `~/.codex/config.toml`.
- Preserves any local `[projects."…"]` blocks already present in the target config.

## Usage
- Sync: `node scripts/sync.js`
- Test: `node scripts/sync.test.js`

## Notes
- Keep personal, machine-specific settings out of `config/config.toml` if you plan to make this repo public or share it with others.
- Sync fails if it detects likely sensitive keys (e.g., password/secret/token/api_key).
