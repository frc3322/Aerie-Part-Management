// 3D Viewer Component
// Handles 3D model viewing functionality using Three.js

import {
    Scene,
    Color,
    PerspectiveCamera,
    WebGLRenderer,
    IcosahedronGeometry,
    SphereGeometry,
    CylinderGeometry,
    BoxGeometry,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Mesh,
    Group,
    AmbientLight,
    DirectionalLight,
    Box3,
    Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Initialize a basic 3D viewer in a container
 * @param {string} containerId - The ID of the container element
 */
export function initBasic3DViewer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Save overlay if it exists
    const overlay = container.querySelector(".absolute");
    container.innerHTML = "";
    if (overlay) container.appendChild(overlay);

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Create scene
    const scene = new Scene();
    scene.background = new Color(0x2d3748);

    // Create camera
    const camera = new PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.z = 3;

    // Create renderer
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    container.insertBefore(renderer.domElement, container.firstChild);

    // Create geometry and material
    const geometry = new IcosahedronGeometry(1, 0);
    const material = new MeshBasicMaterial({
        color: 0x5bc0de,
        wireframe: true,
    });
    const cube = new Mesh(geometry, material);
    scene.add(cube);

    // Animation loop
    const animate = function () {
        // Check if container still exists
        if (!document.getElementById(containerId)) return;

        requestAnimationFrame(animate);
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    };

    animate();
}

/**
 * Create a 3D viewer with custom geometry
 * @param {string} containerId - The ID of the container element
 * @param {Object} options - Configuration options
 * @param {string} options.geometry - Type of geometry ('box', 'sphere', 'cylinder')
 * @param {number} options.color - Color hex code
 * @param {boolean} options.wireframe - Whether to use wireframe
 */
export function initCustom3DViewer(containerId, options = {}) {
    const { geometry = "box", color = 0x5bc0de, wireframe = true } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing content
    const overlay = container.querySelector(".absolute");
    container.innerHTML = "";
    if (overlay) container.appendChild(overlay);

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Create scene
    const scene = new Scene();
    scene.background = new Color(0x2d3748);

    // Create camera
    const camera = new PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.z = 3;

    // Create renderer
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    container.insertBefore(renderer.domElement, container.firstChild);

    // Create geometry based on type
    let geom;
    switch (geometry) {
        case "sphere":
            geom = new SphereGeometry(1, 32, 32);
            break;
        case "cylinder":
            geom = new CylinderGeometry(1, 1, 2, 32);
            break;
        case "box":
        default:
            geom = new BoxGeometry(1, 1, 1);
            break;
    }

    // Create material
    const material = new MeshBasicMaterial({
        color: color,
        wireframe: wireframe,
    });

    // Create mesh
    const mesh = new Mesh(geom, material);
    scene.add(mesh);

    // Animation loop
    const animate = function () {
        if (!document.getElementById(containerId)) return;

        requestAnimationFrame(animate);
        mesh.rotation.x += 0.005;
        mesh.rotation.y += 0.01;
        renderer.render(scene, camera);
    };

    animate();
}

/**
 * Load and display a GLTF model in a container
 * @param {string} containerId - The ID of the container element
 * @param {string} modelUrl - URL to the GLTF/GLB model file
 */
export function loadGLTFModel(containerId, modelUrl) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new Scene();
    scene.background = new Color(0x2d3748);

    const camera = new PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(0, 0, 8); // Moved further back for better view

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Create a group to hold the model for rotation
    const modelGroup = new Group();
    scene.add(modelGroup);

    // Custom controls for rotating the model instead of moving camera
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const handleMouseDown = (event) => {
        if (event.button === 0) {
            // Left click only
            isMouseDown = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
        }
    };

    const handleMouseMove = (event) => {
        if (!isMouseDown) return;

        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;

        // Rotate the model group instead of moving camera
        modelGroup.rotation.y += deltaX * 0.01;
        modelGroup.rotation.x += deltaY * 0.01;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    };

    const handleMouseUp = () => {
        isMouseDown = false;
    };

    // Zoom with mouse wheel
    const handleWheel = (event) => {
        event.preventDefault();
        const zoomSpeed = 0.1;
        const newZ =
            camera.position.z + (event.deltaY > 0 ? zoomSpeed : -zoomSpeed);
        camera.position.z = Math.max(2, Math.min(20, newZ)); // Clamp between 2 and 20
    };

    // Add event listeners
    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("mouseup", handleMouseUp);
    renderer.domElement.addEventListener("wheel", handleWheel, {
        passive: false,
    });

    // Store references for cleanup and resize
    renderer.domElement._modelGroup = modelGroup;
    renderer.domElement._renderer = renderer;
    renderer.domElement._camera = camera;
    renderer.domElement._eventHandlers = {
        mousedown: handleMouseDown,
        mousemove: handleMouseMove,
        mouseup: handleMouseUp,
        wheel: handleWheel,
    };

    // Bright lighting setup for better visibility
    const ambientLight = new AmbientLight(0xffffff, 2);
    scene.add(ambientLight);

    // Main directional light for shading
    const directionalLight = new DirectionalLight(0xffffff, 6);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const loader = new GLTFLoader();

    const loadingIndicator = document.createElement("div");
    loadingIndicator.className =
        "absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10";
    loadingIndicator.innerHTML = `
        <div class="text-center">
            <i class="fa-solid fa-spinner fa-spin text-blue-400 text-2xl mb-2"></i>
            <p class="text-xs text-gray-400">Loading model...</p>
        </div>
    `;
    container.appendChild(loadingIndicator);

    loader.load(
        modelUrl,
        (gltf) => {
            const model = gltf.scene;

            // Ensure all materials respond to lighting
            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        for (const material of child.material) {
                            if (material.isMeshBasicMaterial) {
                                // Convert basic materials to Lambert materials for normal-based shading
                                const newMaterial = new MeshLambertMaterial({
                                    color: material.color,
                                    map: material.map,
                                    transparent: material.transparent,
                                    opacity: material.opacity,
                                    side: material.side,
                                });
                                child.material = newMaterial;
                            }
                            material.needsUpdate = true;
                        }
                    } else {
                        if (child.material.isMeshBasicMaterial) {
                            // Convert basic materials to Lambert materials for normal-based shading
                            const newMaterial = new MeshLambertMaterial({
                                color: child.material.color,
                                map: child.material.map,
                                transparent: child.material.transparent,
                                opacity: child.material.opacity,
                                side: child.material.side,
                            });
                            child.material = newMaterial;
                        }
                        child.material.needsUpdate = true;
                    }
                }
            });

            // Compute bounding box to center the model properly
            const box = new Box3().setFromObject(model);
            const center = box.getCenter(new Vector3());
            const size = box.getSize(new Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = maxDim > 0 ? 2 / maxDim : 1;
            model.scale.multiplyScalar(scale);

            // Center the model by offsetting it
            model.position.sub(center.multiplyScalar(scale));

            // Add model to the rotatable group
            modelGroup.add(model);

            // Calculate the world center of the model (accounting for modelGroup position)
            const worldCenter = new Vector3();
            modelGroup.getWorldPosition(worldCenter);

            // Set camera position for viewing (aligned with part center height)
            camera.position.set(
                worldCenter.x,
                worldCenter.y,
                worldCenter.z + 6
            );
            camera.lookAt(worldCenter);

            loadingIndicator.remove();

            const animate = () => {
                if (!document.getElementById(containerId)) {
                    // Cleanup event listeners when container is removed
                    const canvas = renderer.domElement;
                    if (canvas._eventHandlers) {
                        canvas.removeEventListener(
                            "mousedown",
                            canvas._eventHandlers.mousedown
                        );
                        canvas.removeEventListener(
                            "mousemove",
                            canvas._eventHandlers.mousemove
                        );
                        canvas.removeEventListener(
                            "mouseup",
                            canvas._eventHandlers.mouseup
                        );
                        canvas.removeEventListener(
                            "wheel",
                            canvas._eventHandlers.wheel
                        );
                    }
                    return;
                }
                requestAnimationFrame(animate);
                renderer.render(scene, camera);
            };
            animate();
        },
        (progress) => {
            if (progress.lengthComputable) {
                const percent = (progress.loaded / progress.total) * 100;
                loadingIndicator.querySelector(
                    "p"
                ).textContent = `Loading model... ${Math.round(percent)}%`;
            }
        },
        (error) => {
            console.error("Error loading GLTF model:", error);
            loadingIndicator.innerHTML = `
                <div class="text-center">
                    <i class="fa-solid fa-exclamation-triangle text-red-400 text-2xl mb-2"></i>
                    <p class="text-xs text-gray-400">Failed to load model</p>
                </div>
            `;
        }
    );

    const handleResize = () => {
        if (!document.getElementById(containerId)) {
            window.removeEventListener("resize", handleResize);
            return;
        }
        const newW = container.clientWidth;
        const newH = container.clientHeight;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);
}

/**
 * Resize 3D viewer when container size changes
 * @param {string} containerId - The ID of the container element
 */
export function resize3DViewer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const canvas = container.querySelector("canvas");
    if (!canvas) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Update renderer size
    const renderer = canvas._renderer;
    if (renderer) {
        renderer.setSize(w, h);
    }

    // Update camera aspect ratio
    const camera = canvas._camera;
    if (camera) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
}
