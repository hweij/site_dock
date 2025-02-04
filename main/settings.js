// @ts-check

import * as fs from "fs";
import * as path from "path";

import { getUserDataDir } from "./local_data.js";

/** @type object */
var settings;
const settingsFile = path.join(getUserDataDir(), "settings.json");

export async function getSettings() {
    if (!settings) {
        if (fs.existsSync(settingsFile)) {
            await loadSettingsFrom(settingsFile);
        }
        else {
            // No settings yet: copy default settings and save
            console.log("Initializing settings");
            const defaultSettingsFile = path.join(import.meta.dirname, '../default_settings.json');
            await loadSettingsFrom(defaultSettingsFile);
            await saveSettings();
        }
    }
    return settings;
}

export async function saveSettings() {
    await fs.promises.writeFile(settingsFile, JSON.stringify(settings), { encoding: "utf-8" });
}

async function loadSettingsFrom(fpath) {
    const txt = await fs.promises.readFile(fpath, { encoding: "utf8" });
    settings = JSON.parse(txt);
}
