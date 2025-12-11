const actionRegistry = new Map();
let delegationInitialized = false;

function coerceValue(value) {
    if (value === undefined || value === null) return value;
    if (value === "true") return true;
    if (value === "false") return false;
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue) && value.trim() !== "") return numericValue;
    return value;
}

function buildPayload(element, event) {
    const payload = { event, target: element };
    Object.entries(element.dataset || {}).forEach(([key, value]) => {
        if (key === "action") return;
        payload[key] = coerceValue(value);
    });
    return payload;
}

function dispatchAction(handler, payload) {
    try {
        if (Object.prototype.hasOwnProperty.call(payload, "isNew")) {
            handler(payload.isNew, payload.event);
        } else if (
            Object.prototype.hasOwnProperty.call(payload, "tab") &&
            Object.prototype.hasOwnProperty.call(payload, "index")
        ) {
            handler(payload.tab, payload.index, payload.event);
        } else if (
            Object.prototype.hasOwnProperty.call(payload, "category") &&
            Object.prototype.hasOwnProperty.call(payload, "key")
        ) {
            handler(payload.category, payload.key, payload.event);
        } else if (Object.prototype.hasOwnProperty.call(payload, "tab")) {
            handler(payload.tab, payload.event);
        } else if (Object.prototype.hasOwnProperty.call(payload, "index")) {
            handler(payload.index, payload.event);
        } else if (
            Object.prototype.hasOwnProperty.call(payload, "partId") &&
            Object.prototype.hasOwnProperty.call(payload, "filename")
        ) {
            handler(payload.partId, payload.filename, payload.event);
        } else if (Object.prototype.hasOwnProperty.call(payload, "partId")) {
            handler(payload.partId, payload.event);
        } else {
            handler(payload.event ?? payload);
        }
    } catch (error) {
        console.error("Action handler failed:", error);
    }
}

function findActionHandler(actionName) {
    return actionRegistry.get(actionName) || null;
}

function handleDelegatedClick(event) {
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;
    const actionName = actionElement.dataset.action;
    if (!actionName) return;
    const handler = findActionHandler(actionName);
    if (!handler) {
        console.warn(`No handler registered for action "${actionName}"`);
        return;
    }
    const payload = buildPayload(actionElement, event);
    dispatchAction(handler, payload);
}

function handleDelegatedSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    // Check if form has data-action attribute
    const actionName = form.dataset.action;
    if (!actionName) return;

    const handler = findActionHandler(actionName);
    if (!handler) {
        console.warn(`No handler registered for action "${actionName}"`);
        return;
    }

    const payload = buildPayload(form, event);
    dispatchAction(handler, payload);
}

function handleDelegatedChange(event) {
    const element = event.target;
    if (!element) return;

    // Check if element has data-action attribute
    const actionName = element.dataset.action;
    if (!actionName) return;

    const handler = findActionHandler(actionName);
    if (!handler) {
        console.warn(`No handler registered for action "${actionName}"`);
        return;
    }

    const payload = buildPayload(element, event);
    dispatchAction(handler, payload);
}

function handleDelegatedKeyup(event) {
    const element = event.target;
    if (!element) return;

    // Check if element has data-action attribute
    const actionName = element.dataset.action;
    if (!actionName) return;

    const handler = findActionHandler(actionName);
    if (!handler) {
        console.warn(`No handler registered for action "${actionName}"`);
        return;
    }

    const payload = buildPayload(element, event);
    dispatchAction(handler, payload);
}

export function initEventDelegation(root = document) {
    if (delegationInitialized) return;
    root.addEventListener("click", handleDelegatedClick);
    root.addEventListener("submit", handleDelegatedSubmit);
    root.addEventListener("change", handleDelegatedChange);
    root.addEventListener("keyup", handleDelegatedKeyup);
    delegationInitialized = true;
}

export function registerActions(actionMap) {
    Object.entries(actionMap || {}).forEach(([name, handler]) => {
        if (typeof handler === "function") {
            actionRegistry.set(name, handler);
        }
    });
}
