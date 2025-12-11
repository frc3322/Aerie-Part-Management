export function createElement(tag, options = {}) {
    const element = document.createElement(tag);
    const {
        className,
        text,
        attrs = {},
        dataset = {},
        children = [],
    } = options;
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    Object.entries(attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            element.setAttribute(key, value);
        }
    });
    Object.entries(dataset).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            element.dataset[key] = value;
        }
    });
    children.forEach((child) => {
        if (child) element.appendChild(child);
    });
    return element;
}

export function html(markup) {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return template.content;
}

export function cloneTemplate(id) {
    const tpl = document.getElementById(id);
    if (!tpl || !(tpl instanceof HTMLTemplateElement)) {
        console.warn(`Template "${id}" not found`);
        return null;
    }
    return tpl.content.firstElementChild
        ? tpl.content.firstElementChild.cloneNode(true)
        : null;
}

export function renderList(container, items, renderItem) {
    if (!container) return;
    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
        const node = renderItem(item, index);
        if (node) fragment.appendChild(node);
    });
    container.innerHTML = "";
    container.appendChild(fragment);
}
