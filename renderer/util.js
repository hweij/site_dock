/**
 *
 * @param {string} tag
 * @param {string} className
 * @param  {...(Node | string)} content
 */

export function EL(tag, className = "", ...content) {
    const el = /** @type HTMLElement */ (document.createElement(tag));
    el.className = className;
    el.append(...content);
    return el;
}