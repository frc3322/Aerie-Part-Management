// Info Modal Management Module
// Handles the statistics info modal and chart rendering

import {
    openModal as openManagedModal,
    closeModal as closeManagedModal,
} from "../../core/dom/modalManager.js";
import { hideActionIconKey, showActionIconKey } from "../auth/auth.js";
import { apiGet } from "../../core/api/apiClient.js";

let chartInstance = null;

/**
 * Open the info modal and load statistics
 */
export async function openInfoModal() {
    openManagedModal("info-modal", {
        onOpen: hideActionIconKey,
    });

    // Load statistics
    await loadStatistics();
}

/**
 * Close the info modal
 */
export function closeInfoModal() {
    // Destroy chart instance if it exists
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    closeManagedModal("info-modal", {
        onClose: showActionIconKey,
    });
}

/**
 * Load and display statistics
 */
async function loadStatistics() {
    try {
        const stats = await apiGet("/parts/stats/detailed");

        // Update quick stats
        const statEls = {
            "stat-completed-count": stats.completed_parts ?? 0,
            "stat-in-progress-count": stats.in_progress_parts ?? 0,
            "stat-total-count": stats.total_parts ?? 0,
        };
        for (const [id, val] of Object.entries(statEls)) {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        }

        // Format average completion time
        const avgTimeEl = document.getElementById("stat-avg-time");
        if (avgTimeEl) {
            if (stats.average_completion_time === null) {
                avgTimeEl.textContent = "-";
            } else {
                const hours = stats.average_completion_time;
                if (hours < 1) {
                    avgTimeEl.textContent = `${Math.round(hours * 60)}m`;
                } else if (hours < 24) {
                    avgTimeEl.textContent = `${hours.toFixed(1)}h`;
                } else {
                    avgTimeEl.textContent = `${(hours / 24).toFixed(1)}d`;
                }
            }
        }

        // Render category breakdown
        renderCategoryBreakdown(stats.by_category);

        // Render completion time chart
        renderCompletionTimeChart(stats.completion_time_distribution);

        // Render type breakdown
        renderTypeBreakdown(stats.by_type);

        // Render top contributors
        renderTopContributors(stats.top_contributors);
    } catch (error) {
        console.error("Error loading statistics:", error);
        for (const id of ["stat-completed-count", "stat-in-progress-count", "stat-total-count", "stat-avg-time"]) {
            const el = document.getElementById(id);
            if (el) el.textContent = "Error";
        }
    }
}

/**
 * Render category breakdown
 */
function renderCategoryBreakdown(categories) {
    const container = document.getElementById("category-breakdown");
    if (!container) return;
    if (!categories || typeof categories !== "object") return;

    container.innerHTML = "";

    const categoryData = [
        { name: "Review", key: "review", color: "blue" },
        { name: "CNC/Laser", key: "cnc", color: "purple" },
        { name: "Hand Fab", key: "hand", color: "yellow" },
        { name: "Misc", key: "misc", color: "pink" },
        { name: "Completed", key: "completed", color: "green" },
    ];

    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);

    const colorClassMap = { blue: "bg-blue-400", purple: "bg-purple-400", yellow: "bg-yellow-400", pink: "bg-pink-400", green: "bg-green-400" };
    categoryData.forEach(({ name, key, color }) => {
        const count = categories[key] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const colorClass = colorClassMap[color] ?? "bg-blue-400";

        const barHtml = `
            <div class="flex items-center gap-4">
                <div class="w-24 shrink-0 text-sm text-gray-300 font-medium">${name}</div>
                <div class="flex-1 min-w-0 info-bar-inset rounded-xl h-12 p-2 flex items-center">
                    ${count > 0 ? `
                    <div
                        class="h-full info-bar-outset rounded-xl flex items-center p-1.5 shrink-0 transition-all duration-500"
                        style="width: max(${percentage}%, 2.5rem)"
                    >
                        <div class="h-full flex-1 min-w-0 rounded-lg flex items-center justify-end pr-2 info-bar-color ${colorClass}">
                            <span class="text-xs font-bold text-white drop-shadow-sm">${count}</span>
                        </div>
                    </div>
                    ` : ""}
                </div>
                <div class="w-14 shrink-0 text-sm text-gray-400 text-right">${total > 0 ? percentage.toFixed(1) : "0"}%</div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", barHtml);
    });
}

/**
 * Render completion time pie chart using Chart.js
 */
function renderCompletionTimeChart(distribution) {
    const canvas = document.getElementById("completion-time-chart");
    if (!canvas || !canvas.getContext) return;
    if (!distribution || typeof distribution !== "object") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Destroy existing chart if present
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    // Prepare data
    const labels = Object.keys(distribution);
    const data = Object.values(distribution);
    const total = data.reduce((sum, val) => sum + val, 0);

    // Only show chart if there's data
    if (total === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No completion data yet", canvas.width / 2, canvas.height / 2);
        return;
    }

    // Check if Chart.js is loaded
    if (typeof Chart === "undefined") {
        loadChartJS(0)
            .then(() => renderCompletionTimeChart(distribution))
            .catch((err) => {
                console.error("Chart.js failed to load:", err);
            });
        return;
    }

    // Create pie chart
    chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
            labels: labels,
            datasets: [
                {
                    data: data,
                    backgroundColor: [
                        "rgba(34, 197, 94, 0.8)",  // green
                        "rgba(59, 130, 246, 0.8)", // blue
                        "rgba(168, 85, 247, 0.8)", // purple
                        "rgba(251, 191, 36, 0.8)", // yellow
                        "rgba(239, 68, 68, 0.8)",  // red
                    ],
                    borderColor: [
                        "rgba(34, 197, 94, 1)",
                        "rgba(59, 130, 246, 1)",
                        "rgba(168, 85, 247, 1)",
                        "rgba(251, 191, 36, 1)",
                        "rgba(239, 68, 68, 1)",
                    ],
                    borderWidth: 2,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#9CA3AF",
                        padding: 15,
                        font: {
                            size: 12,
                        },
                    },
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.parsed || 0;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} parts (${percentage}%)`;
                        },
                    },
                },
            },
        },
    });
}

const typeColorClassMap = { purple: "text-purple-400", yellow: "text-yellow-400", pink: "text-pink-400" };

/**
 * Render type breakdown
 */
function renderTypeBreakdown(types) {
    const container = document.getElementById("type-breakdown");
    if (!container) return;
    if (!types || typeof types !== "object") return;

    container.innerHTML = "";

    const typeData = [
        { name: "CNC", key: "cnc", color: "purple" },
        { name: "Hand", key: "hand", color: "yellow" },
        { name: "Misc", key: "misc", color: "pink" },
    ];

    typeData.forEach(({ name, key, color }) => {
        const count = types[key] || 0;
        const colorClass = typeColorClassMap[color] ?? "text-purple-400";

        const cardHtml = `
            <div class="neumorphic-input rounded-xl p-4 text-center">
                <div class="text-2xl font-bold ${colorClass}">${count}</div>
                <div class="text-xs text-gray-400 mt-1">${name}</div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", cardHtml);
    });
}

/**
 * Render top contributors (uses DOM APIs to avoid XSS)
 */
function renderTopContributors(contributors) {
    const container = document.getElementById("top-contributors");
    if (!container) return;

    container.innerHTML = "";

    if (!contributors || !Array.isArray(contributors) || contributors.length === 0) {
        const empty = document.createElement("div");
        empty.className = "text-center text-gray-400 py-4";
        empty.textContent = "No contributions yet";
        container.appendChild(empty);
        return;
    }

    const medals = ["🥇", "🥈", "🥉"];

    contributors.forEach((contributor, index) => {
        const card = document.createElement("div");
        card.className = "neumorphic-input rounded-xl p-3 flex items-center justify-between";

        const left = document.createElement("div");
        left.className = "flex items-center gap-3";

        const medalSpan = document.createElement("span");
        medalSpan.className = "text-2xl";
        medalSpan.textContent = index < 3 ? medals[index] : `#${index + 1}`;

        const nameSpan = document.createElement("span");
        nameSpan.className = "text-gray-300 font-medium";
        nameSpan.textContent = contributor.name ?? "";

        left.appendChild(medalSpan);
        left.appendChild(nameSpan);

        const countDiv = document.createElement("div");
        countDiv.className = "text-blue-400 font-bold";
        countDiv.textContent = `${contributor.count ?? 0} parts`;

        card.appendChild(left);
        card.appendChild(countDiv);
        container.appendChild(card);
    });
}

const CHART_JS_MAX_RETRIES = 3;

/**
 * Dynamically load Chart.js if not already loaded
 * @param {number} retryCount - Current retry attempt
 */
function loadChartJS(retryCount = 0) {
    return new Promise((resolve, reject) => {
        if (typeof Chart !== "undefined") {
            resolve();
            return;
        }
        if (retryCount >= CHART_JS_MAX_RETRIES) {
            reject(new Error("Chart.js failed to load after max retries"));
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
        script.onload = () => {
            if (typeof Chart !== "undefined") {
                resolve();
            } else {
                loadChartJS(retryCount + 1).then(resolve).catch(reject);
            }
        };
        script.onerror = () => {
            if (retryCount + 1 >= CHART_JS_MAX_RETRIES) {
                reject(new Error("Chart.js script failed to load"));
            } else {
                loadChartJS(retryCount + 1).then(resolve).catch(reject);
            }
        };
        document.head.appendChild(script);
    });
}
