// @ts-check

const menuBar = document.getElementById("menu-bar");

/**
 * 
 * @param {MenuItemDesc[]} items 
 */
export function addMenuItems(items) {
    if (menuBar) {
        for (const item of items) {
            const res = createMenuItem(item);
            menuBar.appendChild(res);
        }
    }
}

/**
 * 
 * @param {MenuItemDesc} options 
 */
function createMenuItem(options) {
    const res = document.createElement("div");
    res.className = "menu-item";
    res.innerText = options.label;
    if (options.action) {
        res.onclick = options.action;
    }
    return res;
}
