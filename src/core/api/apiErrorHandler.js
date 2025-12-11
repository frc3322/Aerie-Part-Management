function toggleDisabled(targets, disabled) {
    if (!targets) return;
    const list = Array.isArray(targets) ? targets : [targets];
    list.forEach((el) => {
        if (el) el.disabled = disabled;
    });
}

export async function withErrorHandling(asyncFn, options = {}) {
    const {
        onError,
        onSuccess,
        onFinally,
        loadingTargets = [],
        fallbackMessage = "An error occurred. Please try again.",
    } = options;
    toggleDisabled(loadingTargets, true);
    try {
        const result = await asyncFn();
        if (typeof onSuccess === "function") onSuccess(result);
        return result;
    } catch (error) {
        console.error(error);
        if (typeof onError === "function") {
            onError(error);
        } else {
            alert(error?.message || fallbackMessage);
        }
        throw error;
    } finally {
        toggleDisabled(loadingTargets, false);
        if (typeof onFinally === "function") onFinally();
    }
}
