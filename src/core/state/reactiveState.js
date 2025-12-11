const subscribers = new Map();
let stateRef = null;

function ensureState() {
    if (!stateRef) {
        throw new Error(
            "Reactive state not initialized. Call initReactiveState first."
        );
    }
}

function getPathParts(path) {
    if (!path) return [];
    return path.split(".").filter(Boolean);
}

function getParentAndKey(pathParts) {
    let parent = stateRef;
    for (let i = 0; i < pathParts.length - 1; i += 1) {
        const part = pathParts[i];
        if (!(part in parent)) {
            parent[part] = {};
        }
        parent = parent[part];
    }
    const key = pathParts[pathParts.length - 1];
    return { parent, key };
}

function notify(path, value) {
    const direct = subscribers.get(path);
    if (direct) {
        direct.forEach((callback) => {
            try {
                callback(value, stateRef);
            } catch (error) {
                console.error("Reactive subscriber failed:", error);
            }
        });
    }
    const all = subscribers.get("*");
    if (all) {
        all.forEach((callback) => {
            try {
                callback({ path, value }, stateRef);
            } catch (error) {
                console.error("Reactive subscriber failed:", error);
            }
        });
    }
}

export function initReactiveState(state) {
    stateRef = state;
    return stateRef;
}

export function subscribe(path, callback) {
    const key = path || "*";
    if (!subscribers.has(key)) {
        subscribers.set(key, new Set());
    }
    subscribers.get(key).add(callback);
    return () => {
        subscribers.get(key)?.delete(callback);
    };
}

export function setState(path, valueOrUpdater) {
    ensureState();
    const parts = getPathParts(path);
    if (parts.length === 0) {
        const nextValue =
            typeof valueOrUpdater === "function"
                ? valueOrUpdater(stateRef)
                : valueOrUpdater;
        stateRef = nextValue;
        notify("*", stateRef);
        return stateRef;
    }
    const { parent, key } = getParentAndKey(parts);
    const currentValue = parent[key];
    const nextValue =
        typeof valueOrUpdater === "function"
            ? valueOrUpdater(currentValue)
            : valueOrUpdater;
    parent[key] = nextValue;
    notify(parts.join("."), nextValue);
    return nextValue;
}

export function getState(path = null) {
    ensureState();
    if (!path) return stateRef;
    const parts = getPathParts(path);
    return parts.reduce((value, part) => value?.[part], stateRef);
}
