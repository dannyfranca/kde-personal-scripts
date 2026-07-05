/*
 * Smart Meta Up/Down
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Behavior:
 * - If the active window is already in a common top tile, maximize it.
 * - If this script maximized the active window and it has not been externally
 *   unmaximized since, restore its previous geometry.
 * - If the active window is already in a common bottom tile, minimize it.
 * - If this script minimized a window, restore it from Meta+Up or Meta+Down.
 * - Otherwise, delegate to KWin's built-in quick-tile actions.
 *
 * Target: KDE Plasma 6 / KWin 6 JavaScript scripting API.
 */

const SCRIPT_ID = "smart-meta-up";
const UP_SHORTCUT_TITLE = "Smart Meta Up";
const UP_SHORTCUT_TEXT = "Smart Meta Up: tile top, maximize top tiles, restore script maximizes/minimizes";
const UP_SHORTCUT_DEFAULT = "Meta+Up";
const DOWN_SHORTCUT_TITLE = "Smart Meta Down";
const DOWN_SHORTCUT_TEXT = "Smart Meta Down: tile bottom, minimize bottom tiles, restore script minimizes";
const DOWN_SHORTCUT_DEFAULT = "Meta+Down";

// Pixel tolerance for borders, panels, fractional scaling, and tile gaps.
const TOLERANCE = 12;

let restoreEntries = [];
let watchedWindows = [];
let lastDelegatedTile = null;
let minimizedRestoreEntry = null;

function numberValue(obj, propertyName) {
    if (!obj) {
        return NaN;
    }

    const value = obj[propertyName];
    if (typeof value === "function") {
        return Number(value.call(obj));
    }

    return Number(value);
}

function rectToObject(rect) {
    if (!rect) {
        return null;
    }

    const converted = {
        x: numberValue(rect, "x"),
        y: numberValue(rect, "y"),
        width: numberValue(rect, "width"),
        height: numberValue(rect, "height")
    };

    if (!isFinite(converted.x) || !isFinite(converted.y) ||
        !isFinite(converted.width) || !isFinite(converted.height)) {
        return null;
    }

    return converted;
}

function approxEqual(a, b) {
    return Math.abs(a - b) <= TOLERANCE;
}

function approxTileHeightEqual(a, b, area) {
    const tileHeightTolerance = Math.max(TOLERANCE, Math.round(area.height * 0.04));
    return Math.abs(a - b) <= tileHeightTolerance;
}

function right(rect) {
    return rect.x + rect.width;
}

function isSameAsMaximizeArea(rect, area) {
    return approxEqual(rect.x, area.x) &&
        approxEqual(rect.y, area.y) &&
        approxEqual(rect.width, area.width) &&
        approxEqual(rect.height, area.height);
}

function isSameGeometry(first, second) {
    if (!first || !second) {
        return false;
    }

    return approxEqual(first.x, second.x) &&
        approxEqual(first.y, second.y) &&
        approxEqual(first.width, second.width) &&
        approxEqual(first.height, second.height);
}

function cloneRect(rect) {
    return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
    };
}

function rectForAssignment(rect) {
    if (typeof Qt !== "undefined" && typeof Qt.rect === "function") {
        return Qt.rect(rect.x, rect.y, rect.width, rect.height);
    }

    return cloneRect(rect);
}

function isFullyMaximized(window, geometry, area) {
    try {
        const maximizeMode = numberValue(window, "maximizeMode");

        if (isFinite(maximizeMode)) {
            if (typeof KWin !== "undefined" && typeof KWin.MaximizeFull !== "undefined") {
                return maximizeMode === KWin.MaximizeFull;
            }

            const maximizeHorizontal =
                typeof KWin !== "undefined" && typeof KWin.MaximizeHorizontal !== "undefined" ?
                    KWin.MaximizeHorizontal :
                    2;
            const maximizeVertical =
                typeof KWin !== "undefined" && typeof KWin.MaximizeVertical !== "undefined" ?
                    KWin.MaximizeVertical :
                    1;

            return (maximizeMode & maximizeHorizontal) !== 0 &&
                (maximizeMode & maximizeVertical) !== 0;
        }
    } catch (error) {
        print(SCRIPT_ID + ": unable to read maximize state: " + error);
    }

    return isSameAsMaximizeArea(geometry, area);
}

function isInsideHorizontally(rect, area) {
    return rect.x >= area.x - TOLERANCE &&
        right(rect) <= right(area) + TOLERANCE;
}

function windowGeometry(window) {
    return rectToObject(window.frameGeometry);
}

function tileGeometry(window) {
    try {
        if (!window.tile) {
            return null;
        }

        return rectToObject(window.tile.absoluteGeometryInScreen) ||
            rectToObject(window.tile.absoluteGeometry);
    } catch (error) {
        print(SCRIPT_ID + ": unable to read tile geometry: " + error);
        return null;
    }
}

function commonTopQuickTileKind(rect, area) {
    const topEdgeMatches = approxEqual(rect.y, area.y);
    const halfHeight = approxTileHeightEqual(rect.height, area.height / 2, area);

    if (!topEdgeMatches || !halfHeight) {
        return null;
    }

    if (approxEqual(rect.x, area.x) && approxEqual(rect.width, area.width)) {
        return "top";
    }

    if (approxEqual(rect.x, area.x) && approxEqual(rect.width, area.width / 2)) {
        return "top-left";
    }

    if (approxEqual(right(rect), right(area)) && approxEqual(rect.width, area.width / 2)) {
        return "top-right";
    }

    return null;
}

function commonBottomQuickTileKind(rect, area) {
    const bottomEdgeMatches = approxEqual(rect.y + rect.height, area.y + area.height);
    const halfHeight = approxTileHeightEqual(rect.height, area.height / 2, area);

    if (!bottomEdgeMatches || !halfHeight) {
        return null;
    }

    if (approxEqual(rect.x, area.x) && approxEqual(rect.width, area.width)) {
        return "bottom";
    }

    if (approxEqual(rect.x, area.x) && approxEqual(rect.width, area.width / 2)) {
        return "bottom-left";
    }

    if (approxEqual(right(rect), right(area)) && approxEqual(rect.width, area.width / 2)) {
        return "bottom-right";
    }

    return null;
}

function isTileByKWinTileMetadata(window, area, tileKindForRect) {
    const tile = tileGeometry(window);
    if (!tile) {
        return false;
    }

    if (isSameAsMaximizeArea(tile, area)) {
        return false;
    }

    return tileKindForRect(tile, area) !== null;
}

function isTopTileByKWinTileMetadata(window, area) {
    return isTileByKWinTileMetadata(window, area, commonTopQuickTileKind);
}

function isBottomTileByKWinTileMetadata(window, area) {
    return isTileByKWinTileMetadata(window, area, commonBottomQuickTileKind);
}

function isCommonTopQuickTileGeometry(rect, area) {
    return commonTopQuickTileKind(rect, area) !== null;
}

function isCommonBottomQuickTileGeometry(rect, area) {
    return commonBottomQuickTileKind(rect, area) !== null;
}

function quickTileKind(window, geometry, area, tileKindForRect) {
    const tile = tileGeometry(window);
    if (tile && !isSameAsMaximizeArea(tile, area)) {
        const tileKind = tileKindForRect(tile, area);
        if (tileKind) {
            return tileKind;
        }
    }

    return tileKindForRect(geometry, area);
}

function topQuickTileKind(window, geometry, area) {
    return quickTileKind(window, geometry, area, commonTopQuickTileKind);
}

function isTopTiled(window, area) {
    if (isTopTileByKWinTileMetadata(window, area)) {
        return true;
    }

    const geometry = windowGeometry(window);
    if (!geometry) {
        return false;
    }

    return isCommonTopQuickTileGeometry(geometry, area);
}

function isBottomTiled(window, area) {
    if (isBottomTileByKWinTileMetadata(window, area)) {
        return true;
    }

    const geometry = windowGeometry(window);
    if (!geometry) {
        return false;
    }

    return isCommonBottomQuickTileGeometry(geometry, area);
}

function canHandleWindow(window) {
    if (!window) {
        return false;
    }

    if (window.deleted || !window.managed) {
        return false;
    }

    if (window.specialWindow) {
        return false;
    }

    if (window.fullScreen) {
        return false;
    }

    if (window.maximizable === false) {
        return false;
    }

    return true;
}

function canRestoreKnownWindow(window) {
    if (!window) {
        return false;
    }

    if (window.deleted || !window.managed) {
        return false;
    }

    if (window.specialWindow) {
        return false;
    }

    if (window.fullScreen) {
        return false;
    }

    return true;
}

function isUsableActiveWindow(window) {
    if (!window) {
        return false;
    }

    if (window.deleted || !window.managed) {
        return false;
    }

    if (window.specialWindow || window.minimized) {
        return false;
    }

    return true;
}

function restoreIndexFor(window) {
    for (let i = 0; i < restoreEntries.length; i++) {
        if (restoreEntries[i].window === window) {
            return i;
        }
    }

    return -1;
}

function restoreEntryFor(window) {
    const index = restoreIndexFor(window);
    if (index === -1) {
        return null;
    }

    return restoreEntries[index];
}

function hasRestoreFor(window) {
    return restoreIndexFor(window) !== -1;
}

function clearRestoreFor(window) {
    if (!window) {
        restoreEntries = [];
        return;
    }

    const index = restoreIndexFor(window);
    if (index !== -1) {
        restoreEntries.splice(index, 1);
    }
}

function clearDelegatedTileFor(window) {
    if (!window || (lastDelegatedTile && lastDelegatedTile.window === window)) {
        lastDelegatedTile = null;
    }
}

function rememberDelegatedTile(window, direction) {
    const geometry = windowGeometry(window);

    lastDelegatedTile = {
        window: window,
        direction: direction,
        geometry: geometry ? cloneRect(geometry) : null
    };
}

function isRememberedDelegatedTile(window, geometry, direction) {
    const remembered = lastDelegatedTile &&
        lastDelegatedTile.window === window &&
        lastDelegatedTile.direction === direction &&
        isSameGeometry(lastDelegatedTile.geometry, geometry);

    return Boolean(remembered);
}

function isWindowFullyMaximizedNow(window) {
    const area = rectToObject(workspace.clientArea(KWin.MaximizeArea, window));
    const geometry = windowGeometry(window);

    return area && geometry && isFullyMaximized(window, geometry, area);
}

function clearRestoreAfterExternalUnmaximize(window) {
    if (hasRestoreFor(window) && !isWindowFullyMaximizedNow(window)) {
        clearRestoreFor(window);
    }
}

function clearMinimizedRestoreAfterExternalUnminimize(window) {
    if (minimizedRestoreEntry &&
        minimizedRestoreEntry.window === window &&
        !window.minimized) {
        minimizedRestoreEntry = null;
    }
}

function watchWindow(window) {
    for (let i = 0; i < watchedWindows.length; i++) {
        if (watchedWindows[i] === window) {
            return;
        }
    }

    watchedWindows.push(window);

    if (window.maximizedChanged && window.maximizedChanged.connect) {
        window.maximizedChanged.connect(function () {
            clearRestoreAfterExternalUnmaximize(window);
        });
    }

    if (window.minimizedChanged && window.minimizedChanged.connect) {
        window.minimizedChanged.connect(function () {
            clearMinimizedRestoreAfterExternalUnminimize(window);
        });
    }
}

function saveRestoreGeometry(window, geometry, tileKind) {
    const entry = {
        window: window,
        geometry: cloneRect(geometry),
        tileKind: tileKind
    };

    const index = restoreIndexFor(window);
    if (index === -1) {
        restoreEntries.push(entry);
    } else {
        restoreEntries[index] = entry;
    }

    watchWindow(window);
}

function applyQuickTileRestore(tileKind) {
    if (tileKind === "top-left" && workspace.slotWindowQuickTileTopLeft) {
        workspace.slotWindowQuickTileTopLeft();
        return true;
    }

    if (tileKind === "top-right" && workspace.slotWindowQuickTileTopRight) {
        workspace.slotWindowQuickTileTopRight();
        return true;
    }

    if (tileKind === "top" && workspace.slotWindowQuickTileTop) {
        workspace.slotWindowQuickTileTop();
        return true;
    }

    if (tileKind === "bottom-left" && workspace.slotWindowQuickTileBottomLeft) {
        workspace.slotWindowQuickTileBottomLeft();
        return true;
    }

    if (tileKind === "bottom-right" && workspace.slotWindowQuickTileBottomRight) {
        workspace.slotWindowQuickTileBottomRight();
        return true;
    }

    if (tileKind === "bottom" && workspace.slotWindowQuickTileBottom) {
        workspace.slotWindowQuickTileBottom();
        return true;
    }

    return false;
}

function activateWindow(window) {
    try {
        workspace.activeWindow = window;
    } catch (error) {
        print(SCRIPT_ID + ": unable to activate restored window: " + error);
    }

    if (workspace.raiseWindow) {
        try {
            workspace.raiseWindow(window);
        } catch (error) {
            print(SCRIPT_ID + ": unable to raise restored window: " + error);
        }
    }
}

function restoreScriptMaximize(window) {
    const entry = restoreEntryFor(window);
    if (!entry || !entry.geometry) {
        return;
    }

    clearRestoreFor(window);
    clearDelegatedTileFor(window);
    window.setMaximize(false, false);

    if (!isSameGeometry(windowGeometry(window), entry.geometry)) {
        window.frameGeometry = rectForAssignment(entry.geometry);
    }

    if (applyQuickTileRestore(entry.tileKind)) {
        return;
    }

    if (!isSameGeometry(windowGeometry(window), entry.geometry)) {
        window.frameGeometry = rectForAssignment(entry.geometry);
    }
}

function clearMinimizedRestoreFor(window) {
    if (!window || (minimizedRestoreEntry && minimizedRestoreEntry.window === window)) {
        minimizedRestoreEntry = null;
    }
}

function saveMinimizedRestore(window, geometry) {
    minimizedRestoreEntry = {
        window: window,
        geometry: cloneRect(geometry)
    };

    watchWindow(window);
}

function minimizeWindow(window) {
    clearDelegatedTileFor(window);

    if (workspace.slotWindowMinimize) {
        workspace.slotWindowMinimize();
        return;
    }

    window.minimized = true;
}

function restoreScriptMinimizeIfAny() {
    const entry = minimizedRestoreEntry;
    if (!entry) {
        return false;
    }

    const window = entry.window;
    if (!canRestoreKnownWindow(window)) {
        minimizedRestoreEntry = null;
        return false;
    }

    if (!window.minimized) {
        minimizedRestoreEntry = null;
        return false;
    }

    minimizedRestoreEntry = null;
    window.minimized = false;
    activateWindow(window);

    if (entry.geometry && !isSameGeometry(windowGeometry(window), entry.geometry)) {
        window.frameGeometry = rectForAssignment(entry.geometry);
    }

    return true;
}

function restoreScriptMinimizeIfNoOtherActiveWindow() {
    const activeWindow = workspace.activeWindow;
    const minimizedWindow = minimizedRestoreEntry ? minimizedRestoreEntry.window : null;

    if (activeWindow !== minimizedWindow && isUsableActiveWindow(activeWindow)) {
        return false;
    }

    return restoreScriptMinimizeIfAny();
}

function forgetWindow(window) {
    clearRestoreFor(window);
    clearDelegatedTileFor(window);
    clearMinimizedRestoreFor(window);

    for (let i = watchedWindows.length - 1; i >= 0; i--) {
        if (watchedWindows[i] === window) {
            watchedWindows.splice(i, 1);
        }
    }
}

function smartMetaUp() {
    if (restoreScriptMinimizeIfNoOtherActiveWindow()) {
        return;
    }

    const window = workspace.activeWindow;

    if (!canHandleWindow(window)) {
        return;
    }

    const area = rectToObject(workspace.clientArea(KWin.MaximizeArea, window));
    const geometry = windowGeometry(window);

    if (!area || !geometry) {
        workspace.slotWindowQuickTileTop();
        rememberDelegatedTile(window, "top");
        return;
    }

    if (isFullyMaximized(window, geometry, area)) {
        if (hasRestoreFor(window)) {
            restoreScriptMaximize(window);
        }

        return;
    }

    clearRestoreFor(window);

    const topTiled = isTopTiled(window, area);
    const rememberedDelegated = isRememberedDelegatedTile(window, geometry, "top");

    if (topTiled || rememberedDelegated) {
        saveRestoreGeometry(window, geometry, topQuickTileKind(window, geometry, area));
        clearDelegatedTileFor(window);
        window.setMaximize(true, true);
        return;
    }

    workspace.slotWindowQuickTileTop();
    rememberDelegatedTile(window, "top");
}

function smartMetaDown() {
    if (restoreScriptMinimizeIfNoOtherActiveWindow()) {
        return;
    }

    const window = workspace.activeWindow;

    if (!canHandleWindow(window)) {
        return;
    }

    const area = rectToObject(workspace.clientArea(KWin.MaximizeArea, window));
    const geometry = windowGeometry(window);

    if (!area || !geometry) {
        workspace.slotWindowQuickTileBottom();
        rememberDelegatedTile(window, "bottom");
        return;
    }

    if (isFullyMaximized(window, geometry, area)) {
        if (hasRestoreFor(window)) {
            restoreScriptMaximize(window);
        }

        return;
    }

    clearRestoreFor(window);

    const bottomTiled = isBottomTiled(window, area);
    const rememberedDelegated = isRememberedDelegatedTile(window, geometry, "bottom");

    if (bottomTiled || rememberedDelegated) {
        saveMinimizedRestore(window, geometry);
        minimizeWindow(window);
        return;
    }

    workspace.slotWindowQuickTileBottom();
    rememberDelegatedTile(window, "bottom");
}

registerShortcut(
    UP_SHORTCUT_TITLE,
    UP_SHORTCUT_TEXT,
    UP_SHORTCUT_DEFAULT,
    smartMetaUp
);

registerShortcut(
    DOWN_SHORTCUT_TITLE,
    DOWN_SHORTCUT_TEXT,
    DOWN_SHORTCUT_DEFAULT,
    smartMetaDown
);

if (workspace.windowRemoved && workspace.windowRemoved.connect) {
    workspace.windowRemoved.connect(forgetWindow);
}

print(SCRIPT_ID + " loaded");
