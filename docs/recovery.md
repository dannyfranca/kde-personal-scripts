# Recovery Guide

Use this after reinstalling KDE Plasma or moving to a new machine.

## Restore scripts

```bash
git clone https://github.com/dannyfranca/kde-personal-scripts.git
cd kde-personal-scripts
chmod +x tools/*.sh
./tools/install-all-kwin-scripts.sh
```

## Restore shortcuts

Open:

```text
System Settings > Keyboard > Shortcuts > System Services > Window Management
```

Use `docs/shortcut-map.md` as the source of truth.

For `smart-meta-up`:

1. Open `Window Management`, then search its actions for `Tile top`.
2. Assign `Meta+Up`.
3. Remove or reassign the conflict from `Quick Tile Window to the Top`.

## Verify KWin scripts

Open:

```text
System Settings > Window Management > KWin Scripts
```

Make sure the intended scripts are enabled.

## Uninstall recovery

After uninstalling `smart-meta-up`, restore `Meta+Up` to KDE's built-in `Quick Tile Window to the Top` action if you want the original KDE shortcut behavior back.

## Debug logs

KWin script output can be checked with:

```bash
journalctl -f QT_CATEGORY=js QT_CATEGORY=kwin_scripting
```
