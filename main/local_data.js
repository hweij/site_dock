//@ts-check

import * as fs from "fs";
import * as path from 'path';

import { app } from 'electron';

export function initDataPaths() {
    // Get user path, create if needed
    const userData = getUserDataDir();
    if (!fs.existsSync(userData)) {
        fs.mkdirSync(userData);
        console.log("Creating user data dir: " + userData);
    }
    const sitesDir = getSitesDir();
    if (!fs.existsSync(sitesDir)) {
        fs.mkdirSync(sitesDir);
        console.log("Creating sites dir: " + sitesDir);
    }
    return sitesDir;
}

/**
 * List of local sites and properties.
 */
export async function getLocalSites() {
    /** @type LocalSite[] */
    const res = [];
    const sitesDir = getSitesDir();
    const files = await fs.promises.readdir(sitesDir);
    for (const f of files) {
        if (f.endsWith(".zip")) {
            const baseName = f.substring(0, f.length - 4);
            const idx = (res.findIndex(e => e.name === baseName));
            if (idx >= 0) {
                res[idx].zipped = true;
            }
            else {
                res.push({ name: baseName, expanded: false, zipped: true });
            }
        }
        else {
            const idx = (res.findIndex(e => e.name === f));
            if (idx >= 0) {
                res[idx].expanded = true;
            }
            else {
                res.push({ name: f, expanded: true, zipped: false });
            }
        }
    }
    return res;
}

/**
 * Unique application name, always use the same for this app
 * @returns path to use data
 */
export function getUserDataDir() {
    return app.getPath("userData");
}

export function getSitesDir() {
    return path.resolve(getUserDataDir(), "sites");
}
