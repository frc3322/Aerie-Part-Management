import { showErrorNotification } from '../dom/notificationManager.js';

function toggleDisabled(targets, disabled) {
    if (!targets) return;
    const list = Array.isArray(targets) ? targets : [targets];
    list.forEach((el) => {
        if (el) el.disabled = disabled;
    });
}

function getErrorMessage(error) {
    if (error?.response?.data?.message) {
        return error.response.data.message;
    }
    if (error?.message) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return "An unexpected error occurred. Please try again.";
}

function getErrorTitle(error) {
    if (error?.response?.status) {
        const status = error.response.status;
        if (status >= 500) {
            return "Server Error";
        } else if (status >= 400) {
            return "Request Error";
        } else if (status >= 300) {
            return "Redirection Error";
        }
    }
    if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
        return "Connection Error";
    }
    return "Error";
}

export async function withErrorHandling(asyncFn, options = {}) {
    const {
        onError,
        onSuccess,
        onFinally,
        loadingTargets = [],
        fallbackMessage = "An error occurred. Please try again.",
        showNotification: shouldShowNotification = true,
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
        } else if (shouldShowNotification) {
            const title = getErrorTitle(error);
            const message = getErrorMessage(error) || fallbackMessage;
            showErrorNotification(title, message);
        }
        throw error;
    } finally {
        toggleDisabled(loadingTargets, false);
        if (typeof onFinally === "function") onFinally();
    }
}
