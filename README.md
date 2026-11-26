# Listy

**Everything worth keeping, in lists.**  
*Your lists. Your files. Your control.*

Listy is a universal, **local-first** desktop list manager built with **Tauri 2**, **React**, **TypeScript**, and a custom **WinUI 3+ (Windows 11)** design system. Every list is stored as an independent, human-readable JSON file inside a folder you choose — no cloud, no accounts, no lock-in.

## Features

- **Local-First JSON Storage**: Each list is saved atomically in `lists/<id>.json` inside your chosen folder (compatible with OneDrive, Dropbox, or USB drives). Changes made outside the app (CLI, MCP, a sync client) show up immediately.
- **Universal List Types**: Create **Checklists**, **Simple Lists**, **Priority Lists**, or **Status Lists** (*To Do / In Progress / Done*).
- **Rich Item Metadata**: Optional descriptions, priorities, due dates (custom WinUI 3 DatePicker), tags (`TagInput`), URLs, **Markdown notes** with live syntax highlighting & preview, **subtasks**, **repeating items** (daily / weekly / monthly / yearly), and **file attachments** (`attachments/<list_id>/`).
- **Today**: overdue items, today's items and the next 7 days from all lists in one place (`Ctrl+T`), plus a daily reminder notification.
- **Safe Deletion & Undo**: Deleted lists move to `trash/` (restorable from **Trash**); deleted items move to the list's **Archive**. `Ctrl+Z` undoes the last item change.
- **Backups**: one `.zip` with every list, the trash, attachments and settings. A single list exports as `.json`, or `.zip` with its attachments.
- **WinUI 3+ Desktop Experience**: Custom frameless AppBar with native Windows 11 Snap Layouts (`tauri-plugin-snap-layout`), collapsible Sidebar, Light/Dark/System themes, `F11` Fullscreen, desktop widget, tray icon, start with Windows, and automatic updates.
- **Quick Add from anywhere**: `Ctrl+Alt+Space` opens Quick Add even when Listy is in the tray (`Ctrl+Shift+Space` inside the app).
- **Languages**: English, O‘zbekcha, Русский.
- **CLI & MCP Server**: Control your lists from the terminal (`listy-cli`) or connect AI agents via Model Context Protocol (`listy-mcp`).

## CLI & MCP

Both binaries use the storage folder the app points to (or `--storage <path>` / `LISTY_STORAGE`).

```bash
listy-cli lists                      # all lists (JSON)
listy-cli search milk                # items in all lists
listy-cli add-item groceries --title "Milk" --due 2026-12-01 --repeat weekly --subtasks "2%;oat"
listy-cli set-status board item-1a2b3c4d in_progress
listy-cli help                       # every command
```

`listy-mcp` speaks MCP over stdio. Tools: `get_storage_path`, `list_lists`, `list_trash`, `get_list`, `search`, `create_list`, `delete_list`, `restore_list`, `add_item`, `update_item`, `set_status`, `toggle_item`, `delete_item`.

## Development

```bash
# Install frontend dependencies
bun install

# Run desktop app in development
bun run tauri dev

# Frontend type-check, build & unit tests
bun run build && bun run test

# Rust tests (storage, backup/import, recurrence) and lints
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

# Build CLI & MCP release binaries
cargo build --manifest-path src-tauri/Cargo.toml --release --bin listy-cli --bin listy-mcp
```

All storage logic lives in `src-tauri/src/core.rs` and is shared by the app's Tauri commands (`storage.rs`), `listy-cli` and `listy-mcp`. UI text lives in `src/i18n/locales/<area>.ts` (`en`, `uz`, `ru`).

CI (`.github/workflows/ci.yml`) runs the type-check, build, tests and clippy on every push and pull request.

## Releasing

1. Bump `version` in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
2. Push a tag such as `v0.2.0`. `.github/workflows/release.yml` builds the `.msi` and `-setup.exe` installers, the updater files (`latest.json` and signatures), `listy-cli.exe` and `listy-mcp.exe`, and creates a **draft** GitHub release.
3. Check the draft and publish it. Installed copies of Listy find the new version through `https://github.com/otabekoff/listy/releases/latest/download/latest.json` (set in `plugins.updater.endpoints` in `tauri.conf.json`).

**Updater signing key.** Updates are verified with the public key in `tauri.conf.json`. The matching private key is `~/.tauri/listy.key` on the machine that generated it. Add its contents as the repository secret `TAURI_SIGNING_PRIVATE_KEY` (and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if you give it a password). Back the key up: without it, installed copies can't verify future updates.

**Code signing.** The installers are not code-signed yet, so Windows SmartScreen shows "Unknown publisher" on first install. Signing through the SignPath Foundation program is being set up (see the policy below).

## Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

- **Committers and reviewers:** [Otabek Sadiridinov](https://github.com/otabekoff)
- **Approvers:** [Otabek Sadiridinov](https://github.com/otabekoff)

Only release builds made by the GitHub Actions workflow in this repository (`.github/workflows/release.yml`) from a version tag are signed. Every signing request is approved manually.

**Privacy.** Listy stores your data only in the storage folder you choose. It does not transfer any information to other networked systems unless you ask it to, with one exception: the update check, which downloads the release information file from this repository's GitHub releases (`latest.json`) shortly after start-up and when you click *Check for updates*. No personal data is sent with it.

## Author & License

- **Developer**: Otabek Sadiridinov — [GitHub](https://github.com/otabekoff) · [MohirLab.uz](https://mohirlab.uz)
- **Support**: [UzHandy](https://taps.uz/uzhandy)
- **License**: [MIT License](LICENSE) © 2026 Otabek Sadiridinov (MohirLab.uz)
