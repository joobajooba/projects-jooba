import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function ModelViewer({ src, className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    const modelRoot = new THREE.Group();
    let animationFrameId;
    let framedModelSize = null;

    scene.add(modelRoot);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.mouseButtons = {
      LEFT: null,
      MIDDLE: null,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    const fillLight = new THREE.DirectionalLight(0x72f7ef, 1);

    keyLight.position.set(3, 5, 5);
    fillLight.position.set(-4, 2, 3);
    scene.add(ambientLight, keyLight, fillLight);

    const fitCameraToModel = () => {
      if (!framedModelSize) {
        return;
      }

      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const distanceForHeight = framedModelSize.y / (2 * Math.tan(verticalFov / 2));
      const distanceForWidth = framedModelSize.x / (2 * Math.tan(horizontalFov / 2));
      const distance = Math.max(distanceForHeight, distanceForWidth, framedModelSize.z) * 1.45;

      camera.position.set(0, framedModelSize.y * 0.03, distance);
      camera.near = Math.max(distance / 100, 0.01);
      camera.far = distance + framedModelSize.z * 4 + 10;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
    };

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();

      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      fitCameraToModel();
    };

    const frameModel = (model) => {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z) || 1;

      model.position.sub(center);
      model.scale.setScalar(3 / maxDimension);
      framedModelSize = size.multiplyScalar(model.scale.x);
      fitCameraToModel();
    };

    const loader = new GLTFLoader();

    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        frameModel(model);
        modelRoot.add(model);
      },
      undefined,
      (error) => {
        console.error('Unable to load GLB model:', error);
      },
    );

    const preventContextMenu = (event) => {
      event.preventDefault();
    };

    const animate = () => {
      animationFrameId = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    resize();
    animate();
    renderer.domElement.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('contextmenu', preventContextMenu);
      window.cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [src]);

  return <div ref={mountRef} className={`c-model-viewer${className ? ` ${className}` : ''}`} aria-label="Centered 3D model" />;
}
