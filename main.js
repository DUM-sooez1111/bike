/* global THREE */

// POLY DRIVE
// 외부 물리 엔진 없이 간결한 아케이드 자동차 물리를 구현한 Three.js 게임입니다.
(() => {
  "use strict";

  // Three.js가 네트워크 문제로 로드되지 않은 경우 이해하기 쉬운 오류를 표시합니다.
  if (typeof THREE === "undefined") {
    const error = document.getElementById("error-message");
    error.style.display = "block";
    error.textContent = "Three.js를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.";
    document.getElementById("loading").classList.remove("visible");
    return;
  }

  const canvas = document.getElementById("game-canvas");
  const speedText = document.getElementById("speed");
  const fpsText = document.getElementById("fps");
  const jumpStatus = document.getElementById("jump-status");
  const loading = document.getElementById("loading");
  const startScreen = document.getElementById("start-screen");
  const pauseScreen = document.getElementById("pause-screen");

  // ──────────────────────────────────────────────────────────────────────────
  // 렌더러 / 씬 / 카메라
  // ──────────────────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9bd4ed);
  scene.fog = new THREE.FogExp2(0x9bcfe3, 0.0056);

  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.1,
    600
  );
  camera.position.set(0, 7, -12);

  // 공통 재질 생성 도우미. flatShading으로 Low Poly 표면을 강조합니다.
  const material = (color, roughness = 0.82, metalness = 0.02) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

  const MAT = {
    grass: material(0x78a94f, 1),
    grassAlt: material(0x87b65b, 1),
    dirt: material(0x9a744e, 1),
    ramp: material(0x8a6a48, 0.96),
    concrete: material(0xb7aa91, 0.95),
    concreteDark: material(0x766f65, 0.95),
    orange: material(0xf25324, 0.62),
    orangeDark: material(0xb72f18, 0.72),
    glass: material(0x183a45, 0.22, 0.15),
    black: material(0x151b1d, 0.9),
    tire: material(0x172022, 1),
    rim: material(0xd9d1bd, 0.45, 0.55),
    white: material(0xf5ebd2, 0.75),
    red: material(0xbe382c, 0.65),
    trunk: material(0x70503b, 1),
    leaves: material(0x416f3f, 1),
    leavesLight: material(0x6f9849, 1),
    rock: material(0x746f68, 1),
  };

  // 햇빛과 하늘색 보조광
  const hemiLight = new THREE.HemisphereLight(0xc8edff, 0x57723c, 1.25);
  scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xfff1cf, 2.25);
  sun.position.set(-55, 75, -35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 190;
  sun.shadow.bias = -0.0003;
  scene.add(sun);

  // 큰 구체 안쪽에 색을 입혀 이미지가 필요 없는 스카이박스(스카이 돔)를 만듭니다.
  const skyGeometry = new THREE.SphereGeometry(270, 24, 12);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x54aee0) },
      bottomColor: { value: new THREE.Color(0xe8f4e2) },
      offset: { value: 20 },
      exponent: { value: 0.7 },
    },
    vertexShader:
      "varying vec3 vWorldPosition; void main(){ vec4 p=modelMatrix*vec4(position,1.0); vWorldPosition=p.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader:
      "uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main(){ float h=normalize(vWorldPosition+vec3(0.0,offset,0.0)).y; gl_FragColor=vec4(mix(bottomColor,topColor,max(pow(max(h,0.0),exponent),0.0)),1.0); }",
  });
  scene.add(new THREE.Mesh(skyGeometry, skyMaterial));

  // 장식용 낮은 구름
  function createCloud(x, y, z, scale) {
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      fog: false,
    });
    [[0, 0, 0, 2.6], [2.5, 0.1, 0, 2], [-2.3, -0.1, 0.2, 1.7], [0.6, 0.75, 0, 1.8]]
      .forEach(([px, py, pz, size]) => {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), cloudMat);
        puff.position.set(px, py, pz);
        puff.scale.y = 0.65;
        group.add(puff);
      });
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    scene.add(group);
  }
  createCloud(-48, 38, 24, 1.6);
  createCloud(52, 44, 5, 1.1);
  createCloud(8, 34, 86, 1.35);

  // ──────────────────────────────────────────────────────────────────────────
  // 월드 구성
  // ──────────────────────────────────────────────────────────────────────────
  const world = new THREE.Group();
  scene.add(world);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), MAT.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  // 잔디색이 단조롭지 않도록 넓은 폴리곤 패치를 흩뿌립니다.
  const patchGeometry = new THREE.CircleGeometry(1, 7);
  for (let i = 0; i < 80; i += 1) {
    const patch = new THREE.Mesh(patchGeometry, i % 2 ? MAT.grassAlt : MAT.dirt);
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = Math.random() * Math.PI;
    patch.position.set((Math.random() - 0.5) * 250, 0.012, (Math.random() - 0.5) * 250);
    patch.scale.set(2 + Math.random() * 5, 1 + Math.random() * 2.5, 1);
    world.add(patch);
  }

  // 충돌체는 단순한 XZ축 사각형으로 유지해 연산량을 낮춥니다.
  const colliders = [];

  function addBox(x, y, z, width, height, depth, mat, rotationY = 0, collision = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.add(mesh);
    if (collision && Math.abs(rotationY) < 0.001) {
      colliders.push({
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
      });
    }
    return mesh;
  }

  // 경기장 외곽 벽
  addBox(0, 1.1, -132, 264, 2.2, 2.4, MAT.concrete);
  addBox(0, 1.1, 132, 264, 2.2, 2.4, MAT.concrete);
  addBox(-132, 1.1, 0, 2.4, 2.2, 264, MAT.concrete);
  addBox(132, 1.1, 0, 2.4, 2.2, 264, MAT.concrete);

  // 장애물과 슬라럼 구간
  [
    [-23, 1.5, -28, 8, 3, 3, MAT.concrete],
    [18, 1.2, -47, 4, 2.4, 11, MAT.orange],
    [36, 1.6, 22, 10, 3.2, 3, MAT.concrete],
    [-38, 1.8, 38, 3.5, 3.6, 12, MAT.orange],
    [12, 2.2, 63, 5, 4.4, 5, MAT.concreteDark],
    [-67, 1.4, -4, 9, 2.8, 4, MAT.concrete],
    [73, 1.8, -31, 4, 3.6, 13, MAT.concreteDark],
  ].forEach((args) => addBox(...args));

  // 작은 콘: 시각적 장애물이자 충돌하지 않는 코스 표시물
  function addCone(x, z) {
    const cone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.25, 6), MAT.orange);
    body.position.y = 0.65;
    body.castShadow = true;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 1), MAT.black);
    base.position.y = 0.06;
    base.castShadow = true;
    cone.add(body, base);
    cone.position.set(x, 0, z);
    world.add(cone);
  }
  for (let z = -15; z <= 40; z += 9) addCone(12 + (z % 18 ? -4 : 4), z);

  // 점프대. 위치/방향/크기를 물리 계산에서도 함께 사용합니다.
  const ramps = [];
  function addRamp(x, z, rotationY, width = 8, length = 13, height = 3.8) {
    const shape = new THREE.Shape();
    shape.moveTo(-length / 2, 0);
    shape.lineTo(length / 2, 0);
    shape.lineTo(length / 2, height);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: false,
      steps: 1,
    });
    geometry.translate(0, 0, -width / 2);
    const ramp = new THREE.Mesh(geometry, MAT.ramp);
    ramp.rotation.y = rotationY;
    ramp.position.set(x, 0, z);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    world.add(ramp);
    ramps.push({ x, z, rotationY, width, length, height });
  }
  addRamp(0, 28, 0, 9, 15, 4.2);
  addRamp(-52, -48, Math.PI / 2, 10, 17, 5.2);
  addRamp(58, 53, -Math.PI / 2, 8, 13, 3.8);
  addRamp(-38, 77, Math.PI, 12, 19, 5.8);

  // 로우폴리 나무와 바위
  function addTree(x, z, scale = 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 3.4, 6), MAT.trunk);
    trunk.position.y = 1.7;
    trunk.castShadow = true;
    tree.add(trunk);
    const crown1 = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), MAT.leaves);
    crown1.position.y = 4;
    crown1.castShadow = true;
    tree.add(crown1);
    const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), MAT.leavesLight);
    crown2.position.set(0.7, 4.8, 0);
    crown2.castShadow = true;
    tree.add(crown2);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    world.add(tree);
  }

  const treeSpots = [
    [-104, -95, 1.4], [-88, -105, 1], [-107, -58, 1.2], [-96, 22, 1.35],
    [-108, 78, 1], [-78, 106, 1.25], [-12, 111, 1.2], [43, 109, 1.45],
    [103, 89, 1.1], [112, 38, 1.35], [104, -12, 1.1], [111, -83, 1.4],
    [68, -106, 1.1], [15, -112, 1.35], [-43, -108, 1.05], [-77, 67, 0.9],
  ];
  treeSpots.forEach(([x, z, s]) => addTree(x, z, s));

  for (let i = 0; i < 22; i += 1) {
    const angle = (i / 22) * Math.PI * 2;
    const radius = 88 + Math.random() * 28;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.4, 0), MAT.rock);
    rock.position.set(Math.cos(angle) * radius, 0.7, Math.sin(angle) * radius);
    rock.scale.y = 0.55 + Math.random() * 0.5;
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    world.add(rock);
  }

  // 멀리 보이는 산들
  for (let i = 0; i < 30; i += 1) {
    const angle = (i / 30) * Math.PI * 2;
    const radius = 158 + Math.random() * 25;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(17 + Math.random() * 15, 28 + Math.random() * 28, 5),
      i % 3 ? MAT.rock : MAT.concreteDark
    );
    mountain.position.set(Math.cos(angle) * radius, 8, Math.sin(angle) * radius);
    mountain.rotation.y = Math.random() * Math.PI;
    mountain.receiveShadow = true;
    world.add(mountain);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 자동차 모델
  // ──────────────────────────────────────────────────────────────────────────
  const car = new THREE.Group();
  scene.add(car);

  const carVisual = new THREE.Group();
  car.add(carVisual);

  function carBox(width, height, depth, mat, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    carVisual.add(mesh);
    return mesh;
  }

  // 자동차 전방은 로컬 +Z 방향입니다.
  const chassis = carBox(3.25, 0.72, 5.4, MAT.orange, 0, 1.1, 0);
  chassis.geometry.translate(0, 0.05, 0);
  carBox(3.0, 0.42, 1.15, MAT.orangeDark, 0, 1.06, -2.35);
  carBox(2.62, 1.0, 2.5, MAT.orange, 0, 1.82, -0.15);
  const windshield = carBox(2.38, 0.76, 0.12, MAT.glass, 0, 1.92, 1.12);
  windshield.rotation.x = -0.18;
  const rearGlass = carBox(2.38, 0.7, 0.12, MAT.glass, 0, 1.92, -1.35);
  rearGlass.rotation.x = 0.16;
  carBox(2.68, 0.16, 0.65, MAT.black, 0, 2.4, -0.32);
  carBox(3.5, 0.16, 0.28, MAT.black, 0, 1.42, -2.66);
  carBox(0.2, 0.55, 0.18, MAT.black, -1.78, 1.65, 0.75);
  carBox(0.2, 0.55, 0.18, MAT.black, 1.78, 1.65, 0.75);

  // 전조등 / 후미등
  carBox(0.72, 0.28, 0.08, MAT.white, -0.95, 1.22, 2.72);
  carBox(0.72, 0.28, 0.08, MAT.white, 0.95, 1.22, 2.72);
  carBox(0.62, 0.24, 0.08, MAT.red, -1.02, 1.24, -2.73);
  carBox(0.62, 0.24, 0.08, MAT.red, 1.02, 1.24, -2.73);

  const wheels = [];
  const frontWheelPivots = [];
  function addWheel(x, z, front) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.76, z);
    carVisual.add(pivot);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.61, 0.61, 0.46, 12), MAT.tire);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    pivot.add(wheel);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.48, 8), MAT.rim);
    rim.rotation.z = Math.PI / 2;
    pivot.add(rim);
    wheels.push(wheel, rim);
    if (front) frontWheelPivots.push(pivot);
  }
  addWheel(-1.67, 1.75, true);
  addWheel(1.67, 1.75, true);
  addWheel(-1.67, -1.75, false);
  addWheel(1.67, -1.75, false);

  // 바닥에 부드러운 가짜 그림자를 추가해 차가 지면과 잘 붙어 보이게 합니다.
  const shadowTexture = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
    grad.addColorStop(0, "rgba(0,0,0,.42)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const blobShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.7, 7.4),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    })
  );
  blobShadow.rotation.x = -Math.PI / 2;
  blobShadow.position.y = 0.025;
  scene.add(blobShadow);

  // ──────────────────────────────────────────────────────────────────────────
  // 입력 / 자동차 물리
  // ──────────────────────────────────────────────────────────────────────────
  const keys = Object.create(null);
  let started = false;
  let paused = false;
  let jumpQueued = false;

  const state = {
    position: new THREE.Vector3(0, 0, -8),
    velocity: 0,           // 전후 속도 (m/s)
    verticalVelocity: 0,   // 위아래 속도
    heading: 0,
    grounded: true,
    pitch: 0,
    roll: 0,
    wheelSpin: 0,
    steerVisual: 0,
  };

  const PHYSICS = {
    acceleration: 17.5,
    reverseAcceleration: 11,
    maxForward: 38,       // 약 137 km/h
    maxReverse: 13,
    rollingDrag: 2.2,
    airDrag: 0.018,
    brakeForce: 38,
    steering: 1.75,
    gravity: 24,
    jumpVelocity: 9.5,
  };

  function resetCar() {
    state.position.set(0, 0, -8);
    state.velocity = 0;
    state.verticalVelocity = 0;
    state.heading = 0;
    state.pitch = 0;
    state.roll = 0;
    state.grounded = true;
    carVisual.rotation.set(0, 0, 0);
  }

  function setPaused(value) {
    if (!started) return;
    paused = value;
    pauseScreen.classList.toggle("visible", paused);
    Object.keys(keys).forEach((key) => { keys[key] = false; });
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "shift", " ", "r", "escape"].includes(key)) {
      event.preventDefault();
    }
    if (key === "escape" && started) {
      setPaused(!paused);
      return;
    }
    if (key === "r" && started) {
      resetCar();
      return;
    }
    if (key === " " && !event.repeat) jumpQueued = true;
    keys[key] = true;
  });

  window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
  });

  window.addEventListener("blur", () => {
    if (started && !paused) setPaused(true);
  });

  function localRampCoordinates(ramp, position) {
    const dx = position.x - ramp.x;
    const dz = position.z - ramp.z;
    const c = Math.cos(-ramp.rotationY);
    const s = Math.sin(-ramp.rotationY);
    return {
      x: dx * c - dz * s,
      z: dx * s + dz * c,
    };
  }

  // 점프대 위의 지면 높이와 경사를 계산합니다.
  function getSurfaceInfo(position) {
    for (const ramp of ramps) {
      const local = localRampCoordinates(ramp, position);
      if (Math.abs(local.x) <= ramp.width / 2 + 0.8 &&
          local.z >= -ramp.length / 2 - 0.8 &&
          local.z <= ramp.length / 2 + 0.8) {
        const progress = THREE.MathUtils.clamp(
          (local.z + ramp.length / 2) / ramp.length,
          0,
          1
        );
        return {
          height: progress * ramp.height,
          pitch: -Math.atan2(ramp.height, ramp.length),
          ramp,
          progress,
        };
      }
    }
    return { height: 0, pitch: 0, ramp: null, progress: 0 };
  }

  function resolveCollisions(previousPosition) {
    const radius = 1.55;
    for (const box of colliders) {
      const closestX = THREE.MathUtils.clamp(state.position.x, box.minX, box.maxX);
      const closestZ = THREE.MathUtils.clamp(state.position.z, box.minZ, box.maxZ);
      const dx = state.position.x - closestX;
      const dz = state.position.z - closestZ;
      if (dx * dx + dz * dz < radius * radius) {
        state.position.x = previousPosition.x;
        state.position.z = previousPosition.z;
        state.velocity *= -0.24;
        return;
      }
    }
  }

  function updatePhysics(dt) {
    const throttle = keys.w ? 1 : 0;
    const reverse = keys.s ? 1 : 0;
    const braking = keys.shift;
    const steerInput = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);

    // 엔진 가속: 진행 방향과 반대 키를 누르면 자연스럽게 감속 후 반대 방향으로 갑니다.
    if (throttle) {
      state.velocity += (state.velocity < -0.5 ? PHYSICS.brakeForce * 0.6 : PHYSICS.acceleration) * dt;
    }
    if (reverse) {
      state.velocity -= (state.velocity > 0.5 ? PHYSICS.brakeForce * 0.6 : PHYSICS.reverseAcceleration) * dt;
    }

    // Shift 브레이크는 현재 움직이는 방향의 반대로 강한 힘을 가합니다.
    if (braking && Math.abs(state.velocity) > 0.05) {
      const before = state.velocity;
      state.velocity -= Math.sign(state.velocity) * PHYSICS.brakeForce * dt;
      if (Math.sign(before) !== Math.sign(state.velocity)) state.velocity = 0;
    }

    // 입력이 없을 때 구름 저항 + 타이어 마찰로 서서히 멈춥니다.
    if (!throttle && !reverse) {
      const drag = PHYSICS.rollingDrag + state.velocity * state.velocity * PHYSICS.airDrag;
      const before = state.velocity;
      state.velocity -= Math.sign(state.velocity) * Math.min(Math.abs(state.velocity), drag * dt);
      if (Math.sign(before) !== Math.sign(state.velocity)) state.velocity = 0;
    }
    state.velocity = THREE.MathUtils.clamp(
      state.velocity,
      -PHYSICS.maxReverse,
      PHYSICS.maxForward
    );

    // 고속일수록 조향력이 최대 45%까지 둔해집니다. 공중에서는 8%만 적용됩니다.
    const speedRatio = Math.min(Math.abs(state.velocity) / PHYSICS.maxForward, 1);
    const highSpeedSteering = THREE.MathUtils.lerp(1, 0.45, speedRatio);
    const airControl = state.grounded ? 1 : 0.08;
    const direction = state.velocity >= 0 ? 1 : -1;
    const movingFactor = THREE.MathUtils.clamp(Math.abs(state.velocity) / 4, 0, 1);
    state.heading +=
      steerInput *
      PHYSICS.steering *
      highSpeedSteering *
      airControl *
      movingFactor *
      direction *
      dt;

    const previousPosition = state.position.clone();
    state.position.x += Math.sin(state.heading) * state.velocity * dt;
    state.position.z += Math.cos(state.heading) * state.velocity * dt;
    resolveCollisions(previousPosition);

    const surface = getSurfaceInfo(state.position);

    // 수동 점프. 지상에 있을 때만 큐를 소비합니다.
    if (jumpQueued && state.grounded) {
      state.verticalVelocity = PHYSICS.jumpVelocity;
      state.grounded = false;
    }
    jumpQueued = false;

    if (!state.grounded) {
      state.verticalVelocity -= PHYSICS.gravity * dt;
      state.position.y += state.verticalVelocity * dt;
      state.pitch += (-state.verticalVelocity * 0.003 - state.pitch * 0.3) * dt;
      state.roll += steerInput * 0.05 * dt;
      if (state.position.y <= surface.height && state.verticalVelocity <= 0) {
        state.position.y = surface.height;
        state.verticalVelocity = 0;
        state.grounded = true;
        state.pitch = surface.pitch;
        state.roll *= 0.25;
      }
    } else {
      state.position.y = surface.height;
      state.pitch = THREE.MathUtils.lerp(state.pitch, surface.pitch, 1 - Math.exp(-10 * dt));
      state.roll = THREE.MathUtils.lerp(
        state.roll,
        -steerInput * speedRatio * 0.07,
        1 - Math.exp(-8 * dt)
      );

      // 점프대 끝을 빠르게 통과하면 경사 방향으로 자동 발사됩니다.
      if (surface.ramp && surface.progress > 0.93 && state.velocity > 5) {
        const launchAngle = Math.atan2(surface.ramp.height, surface.ramp.length);
        state.verticalVelocity = Math.max(4.8, state.velocity * Math.sin(launchAngle) * 0.72);
        state.grounded = false;
      }
    }

    // 시각 요소: 바퀴 회전, 앞바퀴 조향, 차체의 부드러운 기울기
    state.wheelSpin += state.velocity * dt / 0.61;
    wheels.forEach((wheel) => { wheel.rotation.x = state.wheelSpin; });
    state.steerVisual = THREE.MathUtils.lerp(
      state.steerVisual,
      -steerInput * 0.42,
      1 - Math.exp(-12 * dt)
    );
    frontWheelPivots.forEach((pivot) => { pivot.rotation.y = state.steerVisual; });

    car.position.copy(state.position);
    car.rotation.y = state.heading;
    carVisual.rotation.x = state.pitch;
    carVisual.rotation.z = state.roll;

    blobShadow.position.set(state.position.x, 0.03, state.position.z);
    blobShadow.material.opacity = THREE.MathUtils.clamp(0.5 - state.position.y * 0.045, 0.08, 0.5);
    blobShadow.scale.setScalar(1 + state.position.y * 0.04);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 부드러운 3인칭 카메라
  // ──────────────────────────────────────────────────────────────────────────
  const cameraTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  function updateCamera(dt) {
    // 속도가 높을수록 카메라를 조금 더 멀리 두어 시야를 넓힙니다.
    const speedZoom = Math.min(Math.abs(state.velocity) / PHYSICS.maxForward, 1);
    const distance = 10.2 + speedZoom * 3.2;
    const height = 5.1 + speedZoom * 0.9;
    const backward = new THREE.Vector3(-Math.sin(state.heading), 0, -Math.cos(state.heading));
    desiredCamera.copy(state.position).addScaledVector(backward, distance);
    desiredCamera.y += height;

    const followT = 1 - Math.exp(-4.2 * dt);
    camera.position.lerp(desiredCamera, followT);

    cameraTarget.set(
      state.position.x + Math.sin(state.heading) * 4.2,
      state.position.y + 1.3,
      state.position.z + Math.cos(state.heading) * 4.2
    );
    lookTarget.lerp(cameraTarget, 1 - Math.exp(-7 * dt));
    camera.lookAt(lookTarget);

    const targetFov = 58 + speedZoom * 8;
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 1 - Math.exp(-3 * dt));
    camera.updateProjectionMatrix();

    // 그림자 카메라가 플레이어 주변을 따라가게 해 넓은 맵에서도 선명하게 유지합니다.
    sun.target.position.set(state.position.x, 0, state.position.z);
    sun.position.set(state.position.x - 55, 75, state.position.z - 35);
    scene.add(sun.target);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 사운드: 외부 음원 없이 Web Audio로 부드러운 엔진음을 합성합니다.
  // ──────────────────────────────────────────────────────────────────────────
  let audioContext = null;
  let engineOsc = null;
  let engineGain = null;
  let soundEnabled = false;
  const soundButton = document.getElementById("sound-toggle");

  function ensureAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = audioContext.createOscillator();
    engineGain = audioContext.createGain();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 45;
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(audioContext.destination);
    engineOsc.start();
  }

  soundButton.addEventListener("click", () => {
    ensureAudio();
    soundEnabled = !soundEnabled;
    if (audioContext.state === "suspended") audioContext.resume();
    soundButton.classList.toggle("active", soundEnabled);
    soundButton.setAttribute("aria-label", soundEnabled ? "엔진 소리 끄기" : "엔진 소리 켜기");
  });

  function updateAudio() {
    if (!audioContext || !engineOsc || !engineGain) return;
    const now = audioContext.currentTime;
    const rpm = Math.abs(state.velocity) / PHYSICS.maxForward;
    engineOsc.frequency.setTargetAtTime(45 + rpm * 95 + (keys.w ? 10 : 0), now, 0.08);
    engineGain.gain.setTargetAtTime(soundEnabled && started && !paused ? 0.018 + rpm * 0.026 : 0, now, 0.12);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UI / 게임 루프
  // ──────────────────────────────────────────────────────────────────────────
  let lastTime = performance.now();
  let fpsFrames = 0;
  let fpsElapsed = 0;

  function updateUI(dt) {
    const kmh = Math.round(Math.abs(state.velocity) * 3.6);
    speedText.textContent = String(kmh).padStart(3, "0");

    fpsFrames += 1;
    fpsElapsed += dt;
    if (fpsElapsed >= 0.4) {
      fpsText.textContent = String(Math.round(fpsFrames / fpsElapsed));
      fpsFrames = 0;
      fpsElapsed = 0;
    }
    jumpStatus.classList.toggle("locked", !state.grounded);
    jumpStatus.lastChild.textContent = state.grounded ? " JUMP READY" : " AIRBORNE";
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (started && !paused) updatePhysics(dt);
    updateCamera(dt);
    updateUI(dt);
    updateAudio();
    renderer.render(scene, camera);
  }

  function startGame() {
    started = true;
    paused = false;
    startScreen.classList.remove("visible");
    pauseScreen.classList.remove("visible");
    lastTime = performance.now();
  }

  document.getElementById("start-button").addEventListener("click", startGame);
  document.getElementById("resume-button").addEventListener("click", () => setPaused(false));

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  });

  // 초기 위치를 적용하고 첫 프레임을 시작합니다.
  resetCar();
  updateCamera(1);
  loading.classList.remove("visible");
  requestAnimationFrame(animate);
})();
