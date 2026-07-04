# KDE / KWin Notes

## Official docs

- KWin scripting tutorial: <https://develop.kde.org/docs/plasma/kwin/>
- KWin scripting API: <https://develop.kde.org/docs/plasma/kwin/api/>

## Package shape

A JavaScript KWin script package looks like this:

```text
script-id/
|-- metadata.json
`-- contents/
    `-- code/
        `-- main.js
```

## Local install command

```bash
kpackagetool6 --type=KWin/Script -i scripts/kwin/script-id
```

The repo installer validates that `KPlugin.Id` in `metadata.json` matches the package folder name before enabling `script-idEnabled` in `kwinrc`.

## Enable command

```bash
kwriteconfig6 --file kwinrc --group Plugins --key script-idEnabled true
qdbus org.kde.KWin /KWin reconfigure
```

Some distros may provide `qdbus6` instead of `qdbus`.

## Interactive test console

```bash
plasma-interactiveconsole --kwin
```

## Debug logs

```bash
journalctl -f QT_CATEGORY=js QT_CATEGORY=kwin_scripting
```
