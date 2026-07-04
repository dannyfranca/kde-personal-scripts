# KDE Personal Scripts

A recovery-friendly collection of personal KDE Plasma scripts and desktop customizations.

This repo is meant to be cloned on any KDE Plasma machine so my custom shortcuts, KWin scripts, and desktop behavior tweaks can be restored without remembering every manual step.

## Included scripts

| Script | Type | Purpose |
|---|---|---|
| `smart-meta-up` | KWin script | Makes `Meta+Up` quick-tile upward, maximizes common top tiles, and restores script-created maximizes. |

## Requirements

- KDE Plasma 6.x
- KWin 6.x
- `kpackagetool6`
- `kwriteconfig6`
- `qdbus` or `qdbus6`
- `python3`

## Quick install

Clone the repo:

```bash
git clone https://github.com/dannyfranca/kde-personal-scripts.git
cd kde-personal-scripts
```

Install the first KWin script:

```bash
./tools/install-kwin-script.sh smart-meta-up
```

Then enable or verify it in:

```text
System Settings > Window Management > KWin Scripts
```

Bind the shortcut in:

```text
System Settings > Keyboard > Shortcuts > System Services > Window Management
```

The action is registered in KDE's KWin/Window Management shortcut component, not
as a standalone application entry. Open `Window Management` first, then search
within its actions for:

```text
Tile top
```

The internal action id is:

```text
Smart Meta Up
```

Set it to:

```text
Meta+Up
```

KDE may warn that this conflicts with `Quick Tile Window to the Top`. Reassign or remove the built-in conflict so `Smart Meta Up` owns `Meta+Up`.

## Install all KWin scripts

```bash
./tools/install-all-kwin-scripts.sh
```

## Reinstall a script after edits

```bash
./tools/reinstall-kwin-script.sh smart-meta-up
```

## Uninstall a script

```bash
./tools/uninstall-kwin-script.sh smart-meta-up
```

If you assigned `Meta+Up` to `Smart Meta Up`, open:

```text
System Settings > Keyboard > Shortcuts
```

Remove the `Smart Meta Up` shortcut if it is still shown, then restore `Meta+Up` to KDE's built-in `Quick Tile Window to the Top` action if you want the original KDE behavior back.

## Add a new KWin script

Create a new package folder:

```bash
mkdir -p scripts/kwin/my-script/contents/code
```

Add:

```text
scripts/kwin/my-script/metadata.json
scripts/kwin/my-script/contents/code/main.js
scripts/kwin/my-script/README.md
```

Make sure `KPlugin.Id` inside `metadata.json` matches the folder name:

```text
my-script
```

Install it:

```bash
./tools/install-kwin-script.sh my-script
```

## Recovery on a new machine

1. Install KDE Plasma 6.
2. Clone this repo.
3. Run `./tools/install-all-kwin-scripts.sh`.
4. Open KDE shortcut settings and apply the shortcuts listed in `docs/shortcut-map.md`.
5. Keep personal/private machine-specific files out of git.

## Security notes

- Install scripts are local-user only.
- No `sudo` is required.
- Do not commit private files from `~/.config` unless reviewed first.
- Shortcut backups and machine-specific notes should stay ignored or private.

## License

GPL-3.0-or-later unless otherwise noted.
