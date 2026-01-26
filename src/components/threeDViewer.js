// 3D Viewer Component
// Handles 3D model viewing functionality using Three.js

import {
    uploadPartViews,
    getPartViewsManifest,
    getPartViewBlobUrl,
    getPartModelBlobUrl,
} from "../core/api/router.js";

const VIEW_CONFIGS = [
    { name: "front", position: [0, 5, 5], lookAt: [0, 0, 0] },
    { name: "front-right", position: [3.5, 4.95, 3.5], lookAt: [0, 0, 0] },
    { name: "right", position: [5, 5, 0], lookAt: [0, 0, 0] },
    { name: "back-right", position: [3.5, 4.95, -3.5], lookAt: [0, 0, 0] },
    { name: "back", position: [0, 5, -5], lookAt: [0, 0, 0] },
    { name: "back-left", position: [-3.5, 4.95, -3.5], lookAt: [0, 0, 0] },
    { name: "left", position: [-5, 5, 0], lookAt: [0, 0, 0] },
    { name: "front-left", position: [-3.5, 4.95, 3.5], lookAt: [0, 0, 0] },
];

// View storage: Stores blob URLs for each part's views
// { partId: { 0: blobUrl, 1: blobUrl, ... } }
const viewBlobCache = new Map();
const viewTimers = new Map();
const pendingViewLoads = new Map();

/**
 * Load and display 8 static views for a part
 * @param {string} containerId - The ID of the container element
 * @param {Object} part - The part data
 */
export async function loadPartStaticViews(containerId, part) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const partId = part.id;

    // 1. Check if we already have views in cache
    if (viewBlobCache.has(partId)) {
        displayEightViewInterface(containerId, partId);
        return;
    }

    // 2. Check if there is already a load in progress for this part
    if (pendingViewLoads.has(partId)) {
        try {
            await pendingViewLoads.get(partId);
            displayEightViewInterface(containerId, partId);
        } catch (error) {
            console.error("Pending view load failed:", error);
        }
        return;
    }

    const loadTask = (async () => {
        // 3. Check if backend has views
        try {
            const manifest = await getPartViewsManifest(partId);
            if (manifest && manifest.views && manifest.views.files) {
                // Load only front view (index 0) initially
                const frontBlobUrl = await getPartViewBlobUrl(partId, 0);
                viewBlobCache.set(partId, { 0: frontBlobUrl });
                displayEightViewInterface(containerId, partId);
                return;
            }
        } catch (error) {
            console.error("Error checking views manifest:", error);
        }

        // 4. If no views, fetch the model and render them
        try {
            const modelUrl = await getPartModelBlobUrl(partId);
            await renderAndUploadViews(containerId, part, modelUrl);
        } catch (error) {
            console.error("Failed to fetch model for view generation:", error);
            container.innerHTML = `<div class="flex items-center justify-center h-full text-red-400 text-xs">Failed to load 3D model</div>`;
            throw error;
        }
    })();

    pendingViewLoads.set(partId, loadTask);
    try {
        await loadTask;
    } finally {
        pendingViewLoads.delete(partId);
    }
}

/**
 * Render 8 views from a GLTF model and upload to backend
 */
async function renderAndUploadViews(containerId, part, modelUrl) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const loadingIndicator = document.createElement("div");
    loadingIndicator.className =
        "absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10";
    loadingIndicator.innerHTML = `
        <div class="text-center">
            <i class="fa-solid fa-spinner fa-spin text-blue-400 text-2xl mb-2"></i>
            <p class="text-xs text-gray-400">Generating views...</p>
        </div>
    `;
    container.appendChild(loadingIndicator);

    try {
        // Dynamically import Three.js components only when needed
        const [THREE, { GLTFLoader }] = await Promise.all([
            import("three"),
            import("three/examples/jsm/loaders/GLTFLoader.js"),
        ]);

        const loader = new GLTFLoader();
        loader.load(
            modelUrl,
            async (gltf) => {
                const model = gltf.scene;

                // Centering and scaling logic
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = maxDim > 0 ? 2 / maxDim : 1;
                model.scale.multiplyScalar(scale);
                model.position.sub(center.multiplyScalar(scale));

                const scene = new THREE.Scene();
                scene.background = null;
                scene.add(model);

                const ambientLight = new THREE.AmbientLight(0xffffff, 2);
                scene.add(ambientLight);
                const directionalLight = new THREE.DirectionalLight(
                    0xffffff,
                    6
                );
                directionalLight.position.set(5, 5, 5);
                scene.add(directionalLight);

                const width = 800;
                const height = 400;
                const padding = 20;
                const contentWidth = width - padding * 2;
                const contentHeight = height - padding * 2;

                const renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                    preserveDrawingBuffer: true,
                });
                renderer.setSize(width, height);
                renderer.setClearColor(0x1f232c, 0.95);

                const views = {};
                const formData = new FormData();
                const aspect = width / height;

                for (let i = 0; i < VIEW_CONFIGS.length; i++) {
                    const config = VIEW_CONFIGS[i];
                    const camera = new THREE.PerspectiveCamera(
                        50,
                        aspect,
                        0.1,
                        1000
                    );
                    camera.position.set(...config.position);
                    camera.lookAt(...config.lookAt);

                    const fovRad = (camera.fov * Math.PI) / 180;
                    const hFovRad =
                        2 * Math.atan(Math.tan(fovRad / 2) * aspect);
                    const distHeight =
                        1 / Math.tan(fovRad / 2) / (contentHeight / height);
                    const distWidth =
                        1 / Math.tan(hFovRad / 2) / (contentWidth / width);
                    const distance = Math.max(distHeight, distWidth);

                    const direction = new THREE.Vector3(
                        ...config.position
                    ).normalize();
                    camera.position.copy(direction.multiplyScalar(distance));

                    renderer.render(scene, camera);

                    const blob = await new Promise((resolve) =>
                        renderer.domElement.toBlob(resolve, "image/png")
                    );
                    const blobUrl = URL.createObjectURL(blob);
                    views[i] = blobUrl;

                    formData.append(`view_${i}`, blob, `view_${i}.png`);
                }

                viewBlobCache.set(part.id, views);
                loadingIndicator.remove();
                displayEightViewInterface(containerId, part.id);

                try {
                    await uploadPartViews(part.id, formData);
                } catch (error) {
                    console.error("Failed to upload views:", error);
                }

                // Cleanup
                renderer.dispose();
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (Array.isArray(child.material)) {
                            child.material.forEach((m) => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            },
            undefined,
            (error) => {
                console.error("Error loading model for views:", error);
                loadingIndicator.innerHTML = `<p class="text-red-400">Failed to generate views</p>`;
            }
        );
    } catch (error) {
        console.error("Failed to load Three.js dependencies:", error);
        loadingIndicator.innerHTML = `<p class="text-red-400">Failed to load viewer engine</p>`;
    }
}

/**
 * Load the remaining 7 views for a part from the backend
 */
async function loadRemainingViews(partId) {
    const views = viewBlobCache.get(partId) || {};
    // Only load if not already loaded
    const promises = [];
    for (let i = 1; i < 8; i++) {
        if (!views[i]) {
            promises.push(
                (async () => {
                    try {
                        const blobUrl = await getPartViewBlobUrl(partId, i);
                        views[i] = blobUrl;
                    } catch (error) {
                        console.error(`Failed to pre-fetch view ${i}:`, error);
                    }
                })()
            );
        }
    }
    if (promises.length > 0) {
        await Promise.all(promises);
        viewBlobCache.set(partId, views);
    }
}

/**
 * Display the 8-view interface and handle drag interactions
 */
function displayEightViewInterface(containerId, partId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    const views = viewBlobCache.get(partId);
    if (!views || !views[0]) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-gray-500">Loading views...</div>`;
        return;
    }

    let currentIndex = 0;
    const img = document.createElement("img");
    img.src = views[currentIndex];
    img.className =
        "w-full h-full object-contain cursor-grab active:cursor-grabbing select-none";
    img.draggable = false;
    container.appendChild(img);

    // Apply background color
    container.style.backgroundColor = "#1f232cf2";

    // Add overlay indicator
    const indicator = document.createElement("div");
    indicator.className =
        "absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none";
    indicator.textContent = `View 1/8`;
    container.appendChild(indicator);

    let isDragging = false;
    let hasTriggeredFullLoad = false;
    let startX = 0;
    const dragThreshold = 40;

    const updateView = (index) => {
        currentIndex = (index + 8) % 8;
        if (views[currentIndex]) {
            img.src = views[currentIndex];
            indicator.textContent = `View ${currentIndex + 1}/8`;
        } else {
            // If view not loaded yet, try to load it
            getPartViewBlobUrl(partId, currentIndex).then((url) => {
                views[currentIndex] = url;
                img.src = url;
                indicator.textContent = `View ${currentIndex + 1}/8`;
            });
        }
    };

    const handleStart = (e) => {
        isDragging = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        resetTimer(partId);

        // Load all views when the user interacts
        if (!hasTriggeredFullLoad) {
            hasTriggeredFullLoad = true;
            loadRemainingViews(partId);
        }
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        const currentX = e.clientX || (e.touches && e.touches[0].clientX);
        const diff = currentX - startX;

        if (Math.abs(diff) > dragThreshold) {
            const step = diff > 0 ? -1 : 1;
            updateView(currentIndex + step);
            startX = currentX;
        }
    };

    const handleEnd = () => {
        isDragging = false;
    };

    img.addEventListener("mousedown", handleStart);
    img.addEventListener("touchstart", handleStart, { passive: true });
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchend", handleEnd);

    // Visibility change and Tab switch handling
    const visibilityHandler = () => {
        if (document.hidden) {
            unloadExtraViews(partId);
            hasTriggeredFullLoad = false;
        }
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    // Store cleanup
    container._cleanup = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchend", handleEnd);
        document.removeEventListener("visibilitychange", visibilityHandler);
    };

    resetTimer(partId);
}

/**
 * Reset the 5-minute idle timer for a part
 */
function resetTimer(partId) {
    if (viewTimers.has(partId)) {
        clearTimeout(viewTimers.get(partId));
    }
    const timer = setTimeout(() => {
        unloadExtraViews(partId);
    }, 5 * 60 * 1000);
    viewTimers.set(partId, timer);
}

/**
 * Unload all views except the first one to save memory
 */
function unloadExtraViews(partId) {
    const views = viewBlobCache.get(partId);
    if (!views) return;

    for (let i = 1; i < 8; i++) {
        if (views[i]) {
            URL.revokeObjectURL(views[i]);
            delete views[i];
        }
    }
    viewBlobCache.set(partId, views);
}

/**
 * Publicly accessible pre-fetch for front view
 */
export async function prefetchPartFrontView(partId) {
    if (viewBlobCache.has(partId)) return;
    if (pendingViewLoads.has(partId)) return pendingViewLoads.get(partId);

    const task = (async () => {
        try {
            const manifest = await getPartViewsManifest(partId);
            if (manifest && manifest.views && manifest.views.files) {
                const blobUrl = await getPartViewBlobUrl(partId, 0);
                viewBlobCache.set(partId, { 0: blobUrl });
            }
        } catch (e) {
            // Silently fail pre-fetch
        }
    })();

    pendingViewLoads.set(partId, task);
    try {
        await task;
    } finally {
        pendingViewLoads.delete(partId);
    }
}
