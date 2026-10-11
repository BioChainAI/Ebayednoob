// Animated particle field shared by standalone pages; same look as index.html.
// Requires three.js (r128) to be loaded globally. Fails silently without WebGL.
export function startBackground(canvasId = "bg-canvas") {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof THREE === "undefined") return;
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    } catch {
        return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const count = 5000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 20;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x00aaff, size: 0.025, transparent: true, blending: THREE.AdditiveBlending }));
    scene.add(particles);
    camera.position.z = 10;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (function animate() {
        if (!still) {
            requestAnimationFrame(animate);
            particles.rotation.y += 0.0001;
            particles.rotation.x += 0.0002;
        }
        renderer.render(scene, camera);
    })();

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (still) renderer.render(scene, camera);
    });
}
