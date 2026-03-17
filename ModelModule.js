import * as THREE from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';

const camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z=13;
const scene = new THREE.Scene();
let logo_model;
const loader = new GLTFLoader();
loader.load('/Portfolio/img/Logo 3D Model.glb',
  function(gltf) {
    logo_model = gltf.scene;
    scene.add(logo_model);
  },
  function (xhr) {},
  function (error) {
    console.error('An error happened', error);
  }
);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setsize(window.innerWidth, window.innerHeight);
document.getElementById('model-container').appendChild(renderer.domElement);

const reRender3D = () => {
  requestAnimationFrame(reRender3D);
  renderer.render(scene, camera);
}
reRender3D();