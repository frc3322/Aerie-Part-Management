// Leaderboard Tab Module
// Handles the leaderboard tab display and functionality

import { appState } from "../state/state.js";
import { getLeaderboard } from "../../core/api/router.js";
import { setState } from "../../core/state/reactiveState.js";

/**
 * Load leaderboard data from server
 */
export async function loadLeaderboard() {
    try {
        setState("loadingTab", "leaderboard");
        const data = await getLeaderboard();
        setState("leaderboard", data.leaderboard || []);
        renderLeaderboard();
    } catch (error) {
        console.error("Failed to load leaderboard:", error);
        setState("leaderboard", []);
        renderLeaderboard();
    } finally {
        setState("loadingTab", null);
    }
}

/**
 * Create leaderboard item element
 * @param {Object} entry - Leaderboard entry {name, score}
 * @param {number} rank - Position in leaderboard
 * @param {number} maxScore - Highest score in leaderboard
 * @returns {HTMLElement} The created leaderboard item
 */
function createLeaderboardItem(entry, rank, maxScore) {
    const item = document.createElement("div");
    item.className =
        "flex items-center justify-between p-4 neumorphic-card-inner rounded-lg";

    const rankIcon =
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅";

    // Calculate bar width as percentage relative to max score
    const barWidth = maxScore > 0 ? (entry.score / maxScore) * 100 : 0;

    // Choose color based on rank
    const barColor =
        rank === 1
            ? "bg-yellow-400"
            : rank === 2
            ? "bg-gray-300"
            : rank === 3
            ? "bg-orange-400"
            : "bg-blue-400";

    item.innerHTML = `
        <div class="flex items-center gap-3 flex-1">
            <span class="text-2xl">${rankIcon}</span>
            <div class="flex items-center justify-between flex-1">
                <div>
                    <div class="font-bold text-gray-200">${entry.name}</div>
                    <div class="text-sm text-gray-500">Rank #${rank}</div>
                </div>
                <div class="flex-1 mx-4 flex items-center">
                    <div class="w-full bg-gray-700 rounded-full h-4">
                        <div class="${barColor} h-4 rounded-full transition-all duration-300" style="width: ${barWidth}%"></div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-blue-400">${entry.score}</div>
                    <div class="text-xs text-gray-500">points</div>
                </div>
            </div>
        </div>
    `;
    return item;
}

/**
 * Render the leaderboard tab
 */
export function renderLeaderboard() {
    const container = document.getElementById("leaderboard-list");
    const emptyMsg = document.getElementById("leaderboard-empty");

    if (!container) return;

    container.innerHTML = "";

    // Show loading state
    if (appState.loadingTab === "leaderboard") {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fa-solid fa-spinner fa-spin text-green-400 mr-2"></i>
                Loading leaderboard...
            </div>
        `;
        if (emptyMsg) emptyMsg.classList.add("hidden");
        return;
    }

    const leaderboard = appState.leaderboard || [];

    if (leaderboard.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove("hidden");
        container.classList.add("hidden");
        return;
    }

    if (emptyMsg) emptyMsg.classList.add("hidden");
    container.classList.remove("hidden");

    // Get max score for proportional bar sizing
    const maxScore = leaderboard.length > 0 ? leaderboard[0].score : 0;

    leaderboard.forEach((entry, index) => {
        const item = createLeaderboardItem(entry, index + 1, maxScore);
        container.appendChild(item);
    });
}
