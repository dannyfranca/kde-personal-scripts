/*
 * Smart Meta Up
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Behavior:
 * - If the active window is already in a common top tile, maximize it.
 * - If this script maximized the active window and it has not been externally
 *   unmaximized since, restore its previous geometry.
 * - Otherwise, delegate to KWin's built-in Quick Tile Top action.
 *
 * Target: KDE Plasma 6 / KWin 6 JavaScript scripting API.
 */

const SCRIPT_ID = "smart-meta-up";
const SHORTCUT_TITLE = "Smart Meta Up";
const SHORTCUT_TEXT = "Smart Meta Up: tile top, maximize top tiles, restore script maximizes";
const SHORTCUT_DEFAULT = "Meta+Up";

// Pixel tolerance for borders, panels, fractional scaling, and tile gaps.
const TOLERANCE = 12;

let restoreEntries = [];
let watchedWindows = [];

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

function right(rect) {
    return rect.x + rect.width;
}

function isSameAsMaximizeArea(rect, area) {
    return approxEqual(rect.x, area.x) &&
        approxEqual(rect.y, area.y) &&
        approxEqual(rect.width, area.width) &&
        approxEqual(rect.height, area.height);
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

function isTopTileByKWinTileMetadata(window, area) {
    const tile = tileGeometry(window);
    if (!tile) {
        return false;
    }

    if (isSameAsMaximizeArea(tile, area)) {
        return false;
    }

    return isCommonTopQuickTileGeometry(tile, area);
}

function isCommonTopQuickTileGeometry(rect, area) {
    const topEdgeMatches = approxEqual(rect.y, area.y);
    const halfHeight = approxEqual(rect.height, area.height / 2);

    const fullWidthTopHalf =
        approxEqual(rect.x, area.x) &&
        approxEqual(rect.width, area.width);

    const topLeftQuarter =
        approxEqual(rect.x, area.x) &&
        approxEqual(rect.width, area.width / 2);

    const topRightQuarter =
        approxEqual(right(rect), right(area)) &&
        approxEqual(rect.width, area.width / 2);

    return topEdgeMatches &&
        halfHeight &&
        (fullWidthTopHalf || topLeftQuarter || topRightQuarter);
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

function restoreIndexFor(window) {
    for (let i = 0; i < restoreEntries.length; i++) {
        if (restoreEntries[i].window === window) {
            return i;
        }
    }

    return -1;
}

function hasRestoreFor(window) {
    return restoreIndexFor(window) !== -1;
}

function restoreGeometryFor(window) {
    const index = restoreIndexFor(window);
    if (index === -1) {
        return null;
    }

    return restoreEntries[index].geometry;
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
}

function saveRestoreGeometry(window, geometry) {
    const entry = {
        window: window,
        geometry: cloneRect(geometry)
    };

    const index = restoreIndexFor(window);
    if (index === -1) {
        restoreEntries.push(entry);
    } else {
        restoreEntries[index] = entry;
    }

    watchWindow(window);
}

function restoreScriptMaximize(window) {
    const geometry = restoreGeometryFor(window);
    if (!geometry) {
        return;
    }

    clearRestoreFor(window);
    window.setMaximize(false, false);
    window.frameGeometry = rectForAssignment(geometry);
}

function forgetWindow(window) {
    clearRestoreFor(window);

    for (let i = watchedWindows.length - 1; i >= 0; i--) {
        if (watchedWindows[i] === window) {
            watchedWindows.splice(i, 1);
        }
    }
}

function smartMetaUp() {
    const window = workspace.activeWindow;

    if (!canHandleWindow(window)) {
        return;
    }

    const area = rectToObject(workspace.clientArea(KWin.MaximizeArea, window));
    const geometry = windowGeometry(window);

    if (!area || !geometry) {
        workspace.slotWindowQuickTileTop();
        return;
    }

    if (isFullyMaximized(window, geometry, area)) {
        if (hasRestoreFor(window)) {
            restoreScriptMaximize(window);
        }

        return;
    }

    clearRestoreFor(window);

    if (isTopTiled(window, area)) {
        saveRestoreGeometry(window, geometry);
        window.setMaximize(true, true);
        return;
    }

    workspace.slotWindowQuickTileTop();
}

registerShortcut(
    SHORTCUT_TITLE,
    SHORTCUT_TEXT,
    SHORTCUT_DEFAULT,
    smartMetaUp
);

if (workspace.windowRemoved && workspace.windowRemoved.connect) {
    workspace.windowRemoved.connect(forgetWindow);
}

print(SCRIPT_ID + " loaded");
