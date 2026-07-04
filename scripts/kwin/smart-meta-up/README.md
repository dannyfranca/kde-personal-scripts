# Smart Meta Up

KWin script for KDE Plasma 6.

## Behavior

`Meta+Up` normally invokes KWin's top quick-tile behavior. This script keeps that behavior, but adds two extra rules:

> When the active window is already in a common top tile, pressing `Meta+Up` again maximizes it.

> When this script maximized the active window, pressing `Meta+Up` again restores the previous tiled geometry.

This gives a Windows-like maximize step while preserving KDE's side-half to top-quarter tiling movement.

## Shortcut

Registered action name:

```text
Smart Meta Up
```

Recommended binding:

```text
Meta+Up
```

Remove or reassign KDE's default conflict:

```text
Quick Tile Window to the Top
```

On Plasma 6.6, this action appears in KDE's KWin/Window Management shortcut
component, not as a standalone application entry:

```text
System Settings > Keyboard > Shortcuts > System Services > Window Management
```

Open `Window Management` first, then search within its actions for:

```text
Tile top
```

KDE may store the shortcut with the internal action id `Smart Meta Up`, while
the UI search matches the visible action text `Tile top, maximize top tiles,
restore script maximizes`.

## Install from repo root

```bash
./tools/install-kwin-script.sh smart-meta-up
```

## Reinstall after editing

```bash
./tools/reinstall-kwin-script.sh smart-meta-up
```

## Test matrix

| Starting state | Press `Meta+Up` | Expected result |
|---|---|---|
| Floating window | Once | Window quick-tiles to the top |
| Left-half tiled window | Once | Window quick-tiles to the top-left quarter |
| Right-half tiled window | Once | Window quick-tiles to the top-right quarter |
| Top-half tiled window | Once | Window maximizes |
| Top-left tiled window | Once | Window maximizes |
| Top-right tiled window | Once | Window maximizes |
| Window maximized by this script | Once | Window restores to its previous top tile |
| Window maximized manually or by another shortcut | Once | No change |
| Fullscreen window | Once | No change |
