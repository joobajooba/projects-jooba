import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export default function FbxModelViewer({ src, className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    const clock = new THREE.Clock();
    const modelRoot = new THREE.Group();
    let animationFrameId;

    scene.add(modelRoot);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    const fillLight = new THREE.DirectionalLight(0x72f7ef, 1);

    keyLight.position.set(3, 5, 5);
    fillLight.position.set(-4, 2, 3);
    scene.add(ambientLight, keyLight, fillLight);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();

      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const frameModel = (model) => {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z) || 1;

      model.position.sub(center);
      model.scale.setScalar(3 / maxDimension);
      camera.position.set(0, 0.35, 5.5);
      camera.lookAt(0, 0, 0);
    };

    const loader = new FBXLoader();

    loader.load(
      src,
      (model) => {
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
        console.error('Unable to load FBX model:', error);
      },
    );

    const animate = () => {
      animationFrameId = window.requestAnimationFrame(animate);
      modelRoot.rotation.y += clock.getDelta() * 0.35;
      renderer.render(scene, camera);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [src]);

  return <div ref={mountRef} className={`c-fbx-viewer${className ? ` ${className}` : ''}`} aria-label="Centered 3D model" />;
}
