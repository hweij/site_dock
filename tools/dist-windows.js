// @ts-check
import * as path from "path";
import * as fs from "fs";
import { execSync } from 'child_process';

// Create a windows distribution

async function createWindowsDist() {
    console.log("Creating windows distribution..");
    /** Project directory */
    const projectDir = path.resolve(import.meta.dirname, "..");
    /** Distribution directory root */
    const distDir = path.resolve(projectDir, "dist");
    /** Windows distribution */
    const winDistDir = path.resolve(distDir, "windows");
    /** Application directory */
    const appDir = path.resolve(winDistDir, "resources/app");

    // Make sure output dir exists
    if (!fs.existsSync(distDir)) {
        console.log(`Output dir ${distDir} does not exist yet, creating..`);
        await fs.promises.mkdir(distDir);
    }

    // Copy electron executable code
    await copyElectron(projectDir, winDistDir);

    // Copy site files
    await copySite(projectDir, appDir);

    // Remove unused node modules
    prune(appDir);

    console.log("Done.");
}

/**
 * Copy Electron files (if distribution not yet present)
 * @param {string} srcDir 
 * @param {string} destDir 
 */
async function copyElectron(srcDir, destDir) {
    if (!fs.existsSync(destDir)) {
        console.log(`Windows dist dir ${destDir} does not exist yet, creating..`);
        await fs.promises.mkdir(destDir);
    }
    /** Electron binaries source */
    const electronSources = path.resolve(srcDir, "node_modules/electron/dist");
    if ((await fs.promises.readdir(destDir)).length === 0) {
        // Copy if directory empty
        console.log("Copying Electron code..");
        await fs.promises.cp(electronSources, destDir, { recursive: true });
    }
}

/**
 * Copy site files
 * @param {string} srcDir 
 * @param {string} destDir 
 */
async function copySite(srcDir, destDir) {
    // If app exists, remove it
    if (fs.existsSync(destDir)) {
        console.log("Removing existing app..");
        await fs.promises.rm(destDir, { recursive: true });
    }
    // Create app dir
    await fs.promises.mkdir(destDir);
    // Copy site files
    console.log("Copying site files..");
    const siteFiles = ["main", "node_modules", "renderer", "index.js"];
    for (const f of siteFiles) {
        await fs.promises.cp(path.resolve(srcDir, f), path.resolve(destDir, f), { recursive: true });
    }
    // Copy filtered package
    const packageFile = await fs.promises.readFile(path.resolve(srcDir, "package.json"), { encoding: "utf8" });
    const jso = JSON.parse(packageFile);
    delete jso["scripts"];
    await fs.promises.writeFile(path.resolve(destDir, "package.json"), JSON.stringify(jso), { encoding: "utf8" });
}

/**
 * Prune node modules
 * @param {string} dir 
 */
function prune(dir) {
    console.log("Pruning node modules..");
    execSync("npm prune --omit=dev", { cwd: dir });
}

createWindowsDist();
