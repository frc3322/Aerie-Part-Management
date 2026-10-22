// Tooltip Manager
// Shows one floating tooltip for elements with data-tooltip. It is fixed to the
// viewport, so it is never clipped by scroll containers or the page edge.

const VIEWPORT_MARGIN = 8;
const TARGET_GAP = 8;

let tooltipElement = null;
let activeTarget = null;

function getTooltipElement() {
    if (!tooltipElement) {
        tooltipElement = document.createElement("div");
        tooltipElement.className = "floating-tooltip";
        tooltipElement.setAttribute("role", "tooltip");
        document.body.appendChild(tooltipElement);
    }
    return tooltipElement;
}

function positionTooltip(tooltip, target) {
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Prefer above the target; flip below when there is no room.
    let top = targetRect.top - tooltipRect.height - TARGET_GAP;
    const placement = top < VIEWPORT_MARGIN ? "below" : "above";
    if (placement === "below") {
        top = targetRect.bottom + TARGET_GAP;
    }

    const centeredLeft =
        targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(centeredLeft, maxLeft));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.dataset.placement = placement;
}

function showTooltip(target) {
    const tooltip = getTooltipElement();
    activeTarget = target;
    tooltip.textContent = target.dataset.tooltip;
    positionTooltip(tooltip, target);
    tooltip.classList.add("visible");
}

function hideTooltip() {
    activeTarget = null;
    tooltipElement?.classList.remove("visible");
}

function handlePointerOver(event) {
    const target = event.target.closest?.("[data-tooltip]");
    if (target === activeTarget) return;
    if (target) {
        showTooltip(target);
    } else {
        hideTooltip();
    }
}

/**
 * Start showing tooltips for [data-tooltip] elements via event delegation.
 */
export function initTooltips() {
    document.addEventListener("mouseover", handlePointerOver);
    document.documentElement.addEventListener("mouseleave", hideTooltip);
    // The target may move or vanish (scroll, tab switch, click), so hide rather than track it.
    document.addEventListener("scroll", hideTooltip, true);
    document.addEventListener("pointerdown", hideTooltip);
    window.addEventListener("blur", hideTooltip);
}
