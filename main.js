/* global THREE */

// NEON TRAILS
// Three.js 하나만으로 구현한 설치 없는 로우폴리 오픈월드 드라이빙 게임입니다.
(() => {
  "use strict";

  if (typeof THREE === "undefined") {
    const error = document.getElementById("error-message");
    error.style.display = "block";
    error.textContent = "포함된 Three.js 파일을 불러오지 못했습니다. vendor 폴더가 index.html과 함께 있는지 확인해 주세요.";
    document.getElementById("loading").classList.remove("visible");
    return;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 데이터: 각 수치는 실제 주행 물리에 직접 반영됩니다.
  // ────────────────────────────────────────────────────────────────────────
  const VEHICLES = [
    {
      id: "trail-fox", name: "Trail Fox", type: "car", className: "RALLY",
      color: 0xf05a35, maxSpeed: 42, acceleration: 18, braking: 36, handling: 1.75,
      description: "흙길과 점프에 강한 균형형 랠리카. 첫 모험에 가장 편안한 선택입니다.",
      scores: { "최고속도": 78, "가속력": 72, "제동력": 75, "핸들링": 80 }
    },
    {
      id: "apex-r", name: "Apex R", type: "super", className: "SPORT",
      color: 0x3575ff, maxSpeed: 52, acceleration: 23, braking: 42, handling: 1.48,
      description: "긴 직선에서 진가를 발휘하는 로우폴리 슈퍼카. 빠르지만 고속 조향은 묵직합니다.",
      scores: { "최고속도": 98, "가속력": 91, "제동력": 88, "핸들링": 66 }
    },
    {
      id: "dust-bug", name: "Dust Bug", type: "buggy", className: "OFFROAD",
      color: 0xf5b52e, maxSpeed: 37, acceleration: 20, braking: 34, handling: 2.05,
      description: "가볍고 민첩한 오프로드 버기. 점프 후 착지가 안정적이고 회전 반응이 빠릅니다.",
      scores: { "최고속도": 67, "가속력": 82, "제동력": 70, "핸들링": 94 }
    },
    {
      id: "city-glide", name: "City Glide", type: "roadster", className: "CRUISER",
      color: 0x52d39a, maxSpeed: 45, acceleration: 16, braking: 39, handling: 1.83,
      description: "부드럽고 예측 가능한 로드스터. 여유로운 드라이브와 코너링에 잘 어울립니다.",
      scores: { "최고속도": 84, "가속력": 65, "제동력": 82, "핸들링": 85 }
    },
    {
      id: "volt-rider", name: "Volt Rider", type: "bike", className: "BIKE",
      color: 0xbe55ff, maxSpeed: 48, acceleration: 25, braking: 31, handling: 2.22,
      description: "폭발적인 가속과 날카로운 조향의 더트 바이크. 공중에서는 아주 적은 조작만 가능합니다.",
      scores: { "최고속도": 90, "가속력": 100, "제동력": 63, "핸들링": 100 }
    }
  ];

  const DESTINATIONS = [
    { name: "시작 지점", copy: "차량 스폰 패드", icon: "🏁", from: "#1e7790", to: "#1c2835", x: 0, z: -12, heading: 0 },
    { name: "메가 점프장", copy: "가장 높은 북쪽 점프대", icon: "🚀", from: "#a95c2e", to: "#35231c", x: -38, z: 67, heading: Math.PI },
    { name: "레이싱 트랙", copy: "동쪽 타원형 서킷", icon: "🏎️", from: "#4e58a6", to: "#24253b", x: 73, z: 3, heading: Math.PI / 2 }
  ];

  const PAINTS = [
    { name: "선셋 오렌지", value: 0xf05a35 },
    { name: "볼트 블루", value: 0x3575ff },
    { name: "민트 러시", value: 0x52d39a },
    { name: "소닉 옐로", value: 0xf5b52e },
    { name: "네온 바이올렛", value: 0xbe55ff },
    { name: "스노 화이트", value: 0xeceff2 }
  ];

  const ACCESSORIES = [
    { id: "flag", icon: "🚩", name: "트레일 깃발" },
    { id: "lights", icon: "✨", name: "루프 라이트" },
    { id: "spoiler", icon: "🏁", name: "스포츠 스포일러" },
    { id: "antenna", icon: "📡", name: "탐험 안테나" }
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const canvas = $("#game-canvas");
  const loading = $("#loading");
  const speedText = $("#speed");
  const fpsText = $("#fps");
  const jumpStatus = $("#jump-status");

  // ────────────────────────────────────────────────────────────────────────
  // 렌더러 / 씬 / 조명
  // ────────────────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91cbed);
  scene.fog = new THREE.Fog(0x9bcde3, 85, 270);

  const camera = new THREE.PerspectiveCamera(59, innerWidth / innerHeight, 0.1, 650);
  camera.position.set(0, 7, -14);

  const flatMaterial = (color, roughness = 0.86, metalness = 0.02) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

  const MAT = {
    grass: flatMaterial(0x6fa550, 1),
    grassLight: flatMaterial(0x83b65a, 1),
    grassDark: flatMaterial(0x5c8f47, 1),
    dirt: flatMaterial(0x9b744f, 1),
    road: flatMaterial(0x454b4c, .98),
    roadEdge: flatMaterial(0xe8d3a2, .85),
    concrete: flatMaterial(0xa9a69b, .96),
    concreteDark: flatMaterial(0x676c6c, .95),
    ramp: flatMaterial(0xc17943, .95),
    orange: flatMaterial(0xf05a35, .7),
    yellow: flatMaterial(0xf6c247, .75),
    dark: flatMaterial(0x171d20, .9),
    tire: flatMaterial(0x111719, 1),
    rim: flatMaterial(0xd9ded9, .45, .5),
    glass: flatMaterial(0x173d4e, .18, .16),
    white: flatMaterial(0xf4ead1, .7),
    red: flatMaterial(0xc62f3b, .65),
    trunk: flatMaterial(0x6b4935, 1),
    leaves: flatMaterial(0x356c42, 1),
    leavesLight: flatMaterial(0x63a14a, 1),
    rock: flatMaterial(0x6d7270, 1),
    water: flatMaterial(0x3c9ac0, .35, .05)
  };

  scene.add(new THREE.HemisphereLight(0xd8f1ff, 0x496b39, 1.3));
  const sun = new THREE.DirectionalLight(0xfff1d2, 2.15);
  sun.position.set(-55, 78, -32);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 180 });
  sun.shadow.bias = -0.00035;
  scene.add(sun, sun.target);

  // 이미지 파일이 없어도 자연스러운 그라데이션 하늘이 보이는 스카이 돔입니다.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(310, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x4eaae0) },
        bottomColor: { value: new THREE.Color(0xeef3d5) },
        offset: { value: 18 },
        exponent: { value: .72 }
      },
      vertexShader: "varying vec3 vPos; void main(){vec4 w=modelMatrix*vec4(position,1.0);vPos=w.xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: "uniform vec3 topColor;uniform vec3 bottomColor;uniform float offset;uniform float exponent;varying vec3 vPos;void main(){float h=normalize(vPos+vec3(0.,offset,0.)).y;gl_FragColor=vec4(mix(bottomColor,topColor,pow(max(h,0.),exponent)),1.);}"
    })
  );
  scene.add(sky);

  // ────────────────────────────────────────────────────────────────────────
  // 월드: 평지, 트랙, 점프대, 벽, 장애물, 식생
  // ────────────────────────────────────────────────────────────────────────
  const world = new THREE.Group();
  scene.add(world);
  const colliders = [];
  const ramps = [];

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(330, 330), MAT.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  // 잔디의 단조로움을 깨는 큰 다각형 패치
  const patchGeo = new THREE.CircleGeometry(1, 7);
  for (let i = 0; i < 95; i += 1) {
    const patch = new THREE.Mesh(patchGeo, i % 5 === 0 ? MAT.dirt : (i % 2 ? MAT.grassLight : MAT.grassDark));
    patch.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    patch.position.set((Math.random() - .5) * 285, .008, (Math.random() - .5) * 285);
    patch.scale.set(3 + Math.random() * 7, 1.5 + Math.random() * 3.5, 1);
    world.add(patch);
  }

  function addBox(x, y, z, width, height, depth, material, rotationY = 0, collision = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.add(mesh);
    if (collision && Math.abs(rotationY) < .001) {
      colliders.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 });
    }
    return mesh;
  }

  // 외곽 벽
  addBox(0, 1.2, -145, 290, 2.4, 2.3, MAT.concrete);
  addBox(0, 1.2, 145, 290, 2.4, 2.3, MAT.concrete);
  addBox(-145, 1.2, 0, 2.3, 2.4, 290, MAT.concrete);
  addBox(145, 1.2, 0, 2.3, 2.4, 290, MAT.concrete);

  // 동쪽 타원형 레이싱 트랙: 짧은 직육면체를 곡선에 맞춰 이어 붙입니다.
  const trackCenter = new THREE.Vector3(68, 0, 5);
  for (let i = 0; i < 54; i += 1) {
    const a = i / 54 * Math.PI * 2;
    const next = (i + 1) / 54 * Math.PI * 2;
    const x = trackCenter.x + Math.cos(a) * 48;
    const z = trackCenter.z + Math.sin(a) * 31;
    const nx = trackCenter.x + Math.cos(next) * 48;
    const nz = trackCenter.z + Math.sin(next) * 31;
    const segment = addBox((x + nx) / 2, .035, (z + nz) / 2, 8.2, .07, Math.hypot(nx - x, nz - z) + .8, MAT.road, Math.atan2(nx - x, nz - z), false);
    segment.receiveShadow = true;
    if (i % 3 === 0) addBox(x, .09, z, .18, .08, 2.3, MAT.roadEdge, Math.atan2(nx - x, nz - z), false);
  }

  // 물리 계산과 정확히 같은 방향을 가진 쐐기형 점프대
  function createRampGeometry(width, length, height) {
    const x = width / 2, z = length / 2;
    const vertices = new Float32Array([
      -x,0,-z, x,0,-z, x,0,z,  -x,0,-z, x,0,z, -x,0,z,
      -x,0,-z, -x,0,z, -x,height,z,  x,0,-z, x,height,z, x,0,z,
      -x,0,z, x,0,z, x,height,z,  -x,0,z, x,height,z, -x,height,z,
      -x,0,-z, -x,height,z, x,height,z,  -x,0,-z, x,height,z, x,0,-z
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  function addRamp(x, z, rotationY, width = 9, length = 15, height = 4.5) {
    const mesh = new THREE.Mesh(createRampGeometry(width, length, height), MAT.ramp);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.add(mesh);
    ramps.push({ x, z, rotationY, width, length, height });
  }
  addRamp(0, 27, 0, 9, 15, 4.4);
  addRamp(-52, -48, Math.PI / 2, 10, 18, 5.2);
  addRamp(52, 61, -Math.PI / 2, 8, 14, 4);
  addRamp(-38, 78, Math.PI, 12, 21, 6.2);
  addRamp(82, -45, Math.PI / 2, 7, 12, 3.3);

  // 컨테이너, 콘, 낮은 벽 등 충돌 장애물
  [
    [-25, 1.6, -28, 9, 3.2, 3, MAT.concrete],
    [20, 1.3, -48, 4, 2.6, 13, MAT.orange],
    [35, 1.8, 24, 11, 3.6, 3, MAT.concrete],
    [-42, 2, 38, 4, 4, 13, MAT.yellow],
    [10, 2.5, 66, 5.5, 5, 5.5, MAT.concreteDark],
    [-71, 1.5, -6, 10, 3, 4, MAT.concrete],
    [3, 1.1, 103, 18, 2.2, 3, MAT.concrete]
  ].forEach(args => addBox(...args));

  function addCone(x, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(.4, 1.2, 6), MAT.orange);
    body.position.y = .65;
    body.castShadow = true;
    const base = new THREE.Mesh(new THREE.BoxGeometry(.9, .12, .9), MAT.dark);
    base.position.y = .06;
    group.add(body, base);
    group.position.set(x, 0, z);
    world.add(group);
  }
  for (let z = -14; z <= 42; z += 8) addCone(12 + (Math.round(z / 8) % 2 ? -5 : 5), z);

  function addTree(x, z, scale = 1) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.35, .52, 3.3, 6), MAT.trunk);
    trunk.position.y = 1.65;
    trunk.castShadow = true;
    const crownA = new THREE.Mesh(new THREE.IcosahedronGeometry(2.05, 1), MAT.leaves);
    crownA.position.y = 4;
    crownA.castShadow = true;
    const crownB = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, 1), MAT.leavesLight);
    crownB.position.set(.65, 4.75, 0);
    crownB.castShadow = true;
    group.add(trunk, crownA, crownB);
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    world.add(group);
  }

  [
    [-116,-105,1.4],[-92,-112,1],[-113,-62,1.2],[-108,24,1.4],[-119,88,1],
    [-85,117,1.3],[-15,122,1.2],[45,117,1.45],[112,101,1.1],[122,48,1.35],
    [119,-14,1.1],[119,-92,1.4],[73,-118,1.1],[15,-124,1.35],[-45,-119,1.05],
    [-78,68,.9],[-18,52,1.1],[26,-82,1.2],[-93,15,1.1]
  ].forEach(p => addTree(...p));

  for (let i = 0; i < 28; i += 1) {
    const angle = i / 28 * Math.PI * 2;
    const radius = 96 + Math.random() * 30;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.7 + Math.random() * 1.5, 0), MAT.rock);
    rock.position.set(Math.cos(angle) * radius, .65, Math.sin(angle) * radius);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = .55 + Math.random() * .5;
    rock.castShadow = true;
    world.add(rock);
  }

  // 맵 경계 밖 배경 산
  for (let i = 0; i < 32; i += 1) {
    const angle = i / 32 * Math.PI * 2;
    const radius = 182 + Math.random() * 24;
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(18 + Math.random() * 16, 35 + Math.random() * 30, 5), i % 3 ? MAT.rock : MAT.concreteDark);
    mountain.position.set(Math.cos(angle) * radius, 10, Math.sin(angle) * radius);
    mountain.rotation.y = Math.random() * Math.PI;
    world.add(mountain);
  }

  function addCloud(x, y, z, scale) {
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .72, fog: false });
    [[0,0,0,2.6],[2.4,.1,0,1.8],[-2.1,-.1,.2,1.6],[.5,.8,0,1.7]].forEach(p => {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(p[3], 1), cloudMat);
      puff.position.set(p[0], p[1], p[2]);
      puff.scale.y = .62;
      group.add(puff);
    });
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    scene.add(group);
  }
  addCloud(-55, 40, 25, 1.5);
  addCloud(60, 46, 0, 1.1);
  addCloud(15, 34, 94, 1.3);

  // 시작 지점의 실제 차량 스폰 패드
  const spawnPad = new THREE.Group();
  const padDisc = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, .16, 32), MAT.concreteDark);
  padDisc.position.y = .08;
  padDisc.receiveShadow = true;
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(4.8, .16, 6, 32), new THREE.MeshBasicMaterial({ color: 0x16c7ff }));
  padRing.rotation.x = Math.PI / 2;
  padRing.position.y = .19;
  spawnPad.add(padDisc, padRing);
  spawnPad.position.set(0, 0, -12);
  world.add(spawnPad);

  // ────────────────────────────────────────────────────────────────────────
  // 절차적 차량 모델. 외부 3D 파일 없이 차종별 실루엣을 만듭니다.
  // ────────────────────────────────────────────────────────────────────────
  function makeMesh(geometry, material, x, y, z, parent) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function buildVehicleModel(definition, paintHex, equipped = new Set()) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const paint = flatMaterial(paintHex, .55, .08);
    const paintDark = flatMaterial(new THREE.Color(paintHex).multiplyScalar(.68), .65, .06);
    const wheels = [];
    const frontPivots = [];

    function wheel(x, y, z, radius, front, width = .42) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      body.add(pivot);
      const tire = makeMesh(new THREE.CylinderGeometry(radius, radius, width, 12), MAT.tire, 0, 0, 0, pivot);
      tire.rotation.z = Math.PI / 2;
      const rim = makeMesh(new THREE.CylinderGeometry(radius * .48, radius * .48, width + .03, 8), MAT.rim, 0, 0, 0, pivot);
      rim.rotation.z = Math.PI / 2;
      wheels.push(tire, rim);
      if (front) frontPivots.push(pivot);
    }

    if (definition.type === "bike") {
      wheel(0, .76, 1.62, .72, true, .32);
      wheel(0, .76, -1.48, .72, false, .32);
      const frame = makeMesh(new THREE.BoxGeometry(.34, .34, 2.25), paint, 0, 1.08, .05, body);
      frame.rotation.x = -.08;
      makeMesh(new THREE.BoxGeometry(.58, .42, 1.05), paint, 0, 1.35, -.35, body);
      const tank = makeMesh(new THREE.SphereGeometry(.52, 8, 6), paint, 0, 1.58, .38, body);
      tank.scale.set(.78, .72, 1.2);
      makeMesh(new THREE.BoxGeometry(.48, .18, .75), MAT.dark, 0, 1.58, -.75, body);
      const fork = makeMesh(new THREE.BoxGeometry(.12, 1.15, .12), MAT.rim, 0, 1.25, 1.35, body);
      fork.rotation.x = -.22;
      makeMesh(new THREE.BoxGeometry(1.12, .1, .12), MAT.dark, 0, 1.85, 1.28, body);
      makeMesh(new THREE.BoxGeometry(.18, .7, .15), MAT.dark, 0, 2.02, -.25, body);
      makeMesh(new THREE.SphereGeometry(.26, 8, 6), MAT.dark, 0, 2.43, -.22, body);
      makeMesh(new THREE.BoxGeometry(.42, .18, .22), MAT.white, 0, 1.75, 1.72, body);
    } else {
      const isBuggy = definition.type === "buggy";
      const isSuper = definition.type === "super";
      const isRoadster = definition.type === "roadster";
      const width = isBuggy ? 2.9 : (isSuper ? 3.15 : 3.05);
      const length = isSuper ? 5.8 : 5.25;
      const wheelRadius = isBuggy ? .72 : (isSuper ? .55 : .61);

      makeMesh(new THREE.BoxGeometry(width, isSuper ? .52 : .68, length), paint, 0, 1.02, 0, body);
      makeMesh(new THREE.BoxGeometry(width * .88, .25, 1.15), paintDark, 0, 1.08, -length * .42, body);
      if (isBuggy) {
        const cabin = makeMesh(new THREE.BoxGeometry(2.15, 1.2, 2.1), MAT.dark, 0, 1.75, -.1, body);
        cabin.material = new THREE.MeshStandardMaterial({ color: 0x1d2b30, roughness: .6, wireframe: true });
        makeMesh(new THREE.BoxGeometry(2.3, .22, .6), paint, 0, 1.38, 1.48, body);
      } else {
        makeMesh(new THREE.BoxGeometry(width * .78, isSuper ? .66 : .92, isRoadster ? 1.75 : 2.35), paint, 0, isSuper ? 1.48 : 1.65, -.25, body);
        const windshield = makeMesh(new THREE.BoxGeometry(width * .7, isSuper ? .52 : .69, .12), MAT.glass, 0, isSuper ? 1.52 : 1.74, .85, body);
        windshield.rotation.x = -.2;
        if (!isRoadster) {
          const rear = makeMesh(new THREE.BoxGeometry(width * .7, isSuper ? .48 : .64, .12), MAT.glass, 0, isSuper ? 1.5 : 1.72, -1.15, body);
          rear.rotation.x = .17;
        } else {
          makeMesh(new THREE.BoxGeometry(width * .72, .14, 1.1), MAT.dark, 0, 2.08, -.45, body);
        }
      }
      makeMesh(new THREE.BoxGeometry(.7, .25, .08), MAT.white, -.87, 1.14, length / 2 + .04, body);
      makeMesh(new THREE.BoxGeometry(.7, .25, .08), MAT.white, .87, 1.14, length / 2 + .04, body);
      makeMesh(new THREE.BoxGeometry(.58, .22, .08), MAT.red, -.92, 1.15, -length / 2 - .04, body);
      makeMesh(new THREE.BoxGeometry(.58, .22, .08), MAT.red, .92, 1.15, -length / 2 - .04, body);
      wheel(-width / 2 - .08, .68, 1.65, wheelRadius, true);
      wheel(width / 2 + .08, .68, 1.65, wheelRadius, true);
      wheel(-width / 2 - .08, .68, -1.65, wheelRadius, false);
      wheel(width / 2 + .08, .68, -1.65, wheelRadius, false);
    }

    // 선택된 무료 장신구를 실제 3D 모델에 추가합니다.
    if (equipped.has("spoiler") && definition.type !== "bike") {
      makeMesh(new THREE.BoxGeometry(3.35, .14, .55), MAT.dark, 0, 2.05, -2.25, body);
      makeMesh(new THREE.BoxGeometry(.13, .58, .13), MAT.dark, -1.1, 1.8, -2.2, body);
      makeMesh(new THREE.BoxGeometry(.13, .58, .13), MAT.dark, 1.1, 1.8, -2.2, body);
    }
    if (equipped.has("lights")) {
      for (let x = -.6; x <= .6; x += .4) makeMesh(new THREE.SphereGeometry(.12, 7, 5), MAT.white, x, definition.type === "bike" ? 2.2 : 2.35, .1, body);
    }
    if (equipped.has("antenna")) {
      makeMesh(new THREE.CylinderGeometry(.025, .025, 1.5, 5), MAT.dark, .65, definition.type === "bike" ? 2.2 : 2.8, -.55, body);
    }
    if (equipped.has("flag")) {
      makeMesh(new THREE.CylinderGeometry(.025, .025, 2.2, 5), MAT.dark, -.75, 2.5, -1.25, body);
      const flag = makeMesh(new THREE.PlaneGeometry(.8, .5), MAT.orange, -.38, 3.35, -1.25, body);
      flag.rotation.y = Math.PI / 2;
    }
    return { root, body, wheels, frontPivots };
  }

  let selectedIndex = 0;
  let previewIndex = 0;
  let selectedPaint = VEHICLES[0].color;
  const equipped = new Set();
  let vehicleVisual = null;
  const vehicle = new THREE.Group();
  scene.add(vehicle);

  function rebuildPlayerVehicle() {
    if (vehicleVisual) vehicle.remove(vehicleVisual.root);
    vehicleVisual = buildVehicleModel(VEHICLES[selectedIndex], selectedPaint, equipped);
    vehicle.add(vehicleVisual.root);
  }
  rebuildPlayerVehicle();

  // 지면 접지감을 위한 부드러운 가짜 그림자
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d");
  const shadowGradient = shadowContext.createRadialGradient(64,64,10,64,64,62);
  shadowGradient.addColorStop(0, "rgba(0,0,0,.42)");
  shadowGradient.addColorStop(1, "rgba(0,0,0,0)");
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0,0,128,128);
  const blobShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 7.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
  );
  blobShadow.rotation.x = -Math.PI / 2;
  scene.add(blobShadow);

  // ────────────────────────────────────────────────────────────────────────
  // 자동차 물리
  // ────────────────────────────────────────────────────────────────────────
  const keys = Object.create(null);
  const state = {
    position: new THREE.Vector3(0, 0, -12),
    velocity: 0,
    verticalVelocity: 0,
    heading: 0,
    grounded: true,
    pitch: 0,
    roll: 0,
    wheelSpin: 0,
    steerVisual: 0
  };
  const PHYSICS = {
    reverseAcceleration: 11,
    maxReverse: 13,
    rollingDrag: 2.15,
    airDrag: .015,
    gravity: 24,
    jumpVelocity: 9.7
  };
  let started = false;
  let paused = false;
  let uiOpen = false;
  let jumpQueued = false;

  function currentVehicle() { return VEHICLES[selectedIndex]; }
  function clearKeys() { Object.keys(keys).forEach(key => { keys[key] = false; }); }

  function placeVehicle(x, z, heading = 0, message = "") {
    state.position.set(x, 0, z);
    state.velocity = 0;
    state.verticalVelocity = 0;
    state.heading = heading;
    state.grounded = true;
    state.pitch = 0;
    state.roll = 0;
    vehicleVisual.body.rotation.set(0, 0, 0);
    if (message) showToast(message);
  }

  function resetVehicle() {
    // 차가 뒤집혔거나 맵에서 이탈했을 때 현재 XZ 위치를 유지하며 바로 세웁니다.
    state.position.y = Math.max(0, getSurfaceInfo(state.position).height);
    state.velocity = 0;
    state.verticalVelocity = 0;
    state.grounded = true;
    state.pitch = 0;
    state.roll = 0;
    vehicleVisual.body.rotation.set(0, 0, 0);
    showToast("차량을 바른 방향으로 복구했습니다.");
  }

  function localRampCoordinates(ramp, position) {
    const dx = position.x - ramp.x;
    const dz = position.z - ramp.z;
    const c = Math.cos(-ramp.rotationY);
    const s = Math.sin(-ramp.rotationY);
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  }

  function getSurfaceInfo(position) {
    for (const ramp of ramps) {
      const local = localRampCoordinates(ramp, position);
      if (Math.abs(local.x) <= ramp.width / 2 + .8 && local.z >= -ramp.length / 2 - .8 && local.z <= ramp.length / 2 + .8) {
        const progress = THREE.MathUtils.clamp((local.z + ramp.length / 2) / ramp.length, 0, 1);
        return { height: progress * ramp.height, pitch: -Math.atan2(ramp.height, ramp.length), ramp, progress };
      }
    }
    return { height: 0, pitch: 0, ramp: null, progress: 0 };
  }

  function resolveCollisions(previous) {
    const radius = currentVehicle().type === "bike" ? .85 : 1.5;
    for (const box of colliders) {
      const x = THREE.MathUtils.clamp(state.position.x, box.minX, box.maxX);
      const z = THREE.MathUtils.clamp(state.position.z, box.minZ, box.maxZ);
      const dx = state.position.x - x;
      const dz = state.position.z - z;
      if (dx * dx + dz * dz < radius * radius && state.position.y < 3.2) {
        state.position.x = previous.x;
        state.position.z = previous.z;
        state.velocity *= -.22;
        return;
      }
    }
  }

  function updatePhysics(dt) {
    const spec = currentVehicle();
    const throttle = keys.w ? 1 : 0;
    const reverse = keys.s ? 1 : 0;
    const braking = !!keys.shift;
    const steer = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);

    if (throttle) state.velocity += (state.velocity < -.5 ? spec.braking * .62 : spec.acceleration) * dt;
    if (reverse) state.velocity -= (state.velocity > .5 ? spec.braking * .62 : PHYSICS.reverseAcceleration) * dt;

    if (braking && Math.abs(state.velocity) > .03) {
      const before = state.velocity;
      state.velocity -= Math.sign(state.velocity) * spec.braking * dt;
      if (Math.sign(before) !== Math.sign(state.velocity)) state.velocity = 0;
    }

    // 스로틀을 놓으면 구름저항과 타이어 마찰이 관성에 점진적으로 작용합니다.
    if (!throttle && !reverse) {
      const drag = PHYSICS.rollingDrag + state.velocity * state.velocity * PHYSICS.airDrag;
      state.velocity -= Math.sign(state.velocity) * Math.min(Math.abs(state.velocity), drag * dt);
    }
    state.velocity = THREE.MathUtils.clamp(state.velocity, -PHYSICS.maxReverse, spec.maxSpeed);

    const speedRatio = Math.min(Math.abs(state.velocity) / spec.maxSpeed, 1);
    const highSpeedSteering = THREE.MathUtils.lerp(1, .43, speedRatio);
    const airControl = state.grounded ? 1 : .07;
    const moving = THREE.MathUtils.clamp(Math.abs(state.velocity) / 3.8, 0, 1);
    state.heading += steer * spec.handling * highSpeedSteering * airControl * moving * (state.velocity >= 0 ? 1 : -1) * dt;

    const previous = state.position.clone();
    state.position.x += Math.sin(state.heading) * state.velocity * dt;
    state.position.z += Math.cos(state.heading) * state.velocity * dt;
    resolveCollisions(previous);

    const surface = getSurfaceInfo(state.position);
    if (jumpQueued && state.grounded) {
      state.verticalVelocity = PHYSICS.jumpVelocity;
      state.grounded = false;
    }
    jumpQueued = false;

    if (!state.grounded) {
      state.verticalVelocity -= PHYSICS.gravity * dt;
      state.position.y += state.verticalVelocity * dt;
      state.pitch += (-state.verticalVelocity * .0027 - state.pitch * .28) * dt;
      state.roll += steer * (spec.type === "bike" ? .11 : .045) * dt;
      if (state.position.y <= surface.height && state.verticalVelocity <= 0) {
        state.position.y = surface.height;
        state.verticalVelocity = 0;
        state.grounded = true;
        state.pitch = surface.pitch;
        state.roll *= .22;
      }
    } else {
      state.position.y = surface.height;
      state.pitch = THREE.MathUtils.lerp(state.pitch, surface.pitch, 1 - Math.exp(-10 * dt));
      const lean = spec.type === "bike" ? .24 : .065;
      state.roll = THREE.MathUtils.lerp(state.roll, -steer * speedRatio * lean, 1 - Math.exp(-8 * dt));
      if (surface.ramp && surface.progress > .93 && state.velocity > 5) {
        const angle = Math.atan2(surface.ramp.height, surface.ramp.length);
        state.verticalVelocity = Math.max(4.8, state.velocity * Math.sin(angle) * .72);
        state.grounded = false;
      }
    }

    if (state.position.y < -8 || Math.abs(state.position.x) > 158 || Math.abs(state.position.z) > 158) {
      placeVehicle(0, -12, 0, "맵 밖으로 벗어나 스폰 지점으로 돌아왔습니다.");
    }

    state.wheelSpin += state.velocity * dt / .62;
    vehicleVisual.wheels.forEach(wheel => { wheel.rotation.x = state.wheelSpin; });
    state.steerVisual = THREE.MathUtils.lerp(state.steerVisual, -steer * .38, 1 - Math.exp(-12 * dt));
    vehicleVisual.frontPivots.forEach(pivot => { pivot.rotation.y = state.steerVisual; });

    vehicle.position.copy(state.position);
    vehicle.rotation.y = state.heading;
    vehicleVisual.body.rotation.x = state.pitch;
    vehicleVisual.body.rotation.z = state.roll;
    blobShadow.position.set(state.position.x, .025, state.position.z);
    blobShadow.material.opacity = THREE.MathUtils.clamp(.48 - state.position.y * .045, .08, .48);
    blobShadow.scale.setScalar(1 + state.position.y * .035);
  }

  // ────────────────────────────────────────────────────────────────────────
  // 부드러운 3인칭 카메라 + 마우스 드래그 시점
  // ────────────────────────────────────────────────────────────────────────
  const desiredCamera = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const smoothedTarget = new THREE.Vector3();
  let cameraYaw = 0;
  let cameraPitch = 0;
  let draggingCamera = false;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let mouseSensitivity = .55;

  canvas.addEventListener("pointerdown", event => {
    draggingCamera = true;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
  });
  window.addEventListener("pointerup", () => { draggingCamera = false; });
  window.addEventListener("pointermove", event => {
    if (!draggingCamera || uiOpen) return;
    cameraYaw -= (event.clientX - previousPointerX) * .004 * mouseSensitivity;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch + (event.clientY - previousPointerY) * .0025 * mouseSensitivity, -.2, .35);
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
  });

  function updateCamera(dt) {
    const speedRatio = Math.min(Math.abs(state.velocity) / currentVehicle().maxSpeed, 1);
    const distance = 10.8 + speedRatio * 3.3;
    const angle = state.heading + cameraYaw;
    desiredCamera.set(
      state.position.x - Math.sin(angle) * distance,
      state.position.y + 5.2 + speedRatio + cameraPitch * 8,
      state.position.z - Math.cos(angle) * distance
    );
    camera.position.lerp(desiredCamera, 1 - Math.exp(-4.4 * dt));
    cameraTarget.set(
      state.position.x + Math.sin(state.heading) * 4,
      state.position.y + 1.25,
      state.position.z + Math.cos(state.heading) * 4
    );
    smoothedTarget.lerp(cameraTarget, 1 - Math.exp(-7 * dt));
    camera.lookAt(smoothedTarget);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 59 + speedRatio * 7, 1 - Math.exp(-3 * dt));
    camera.updateProjectionMatrix();
    cameraYaw *= Math.exp(-.18 * dt);

    sun.target.position.set(state.position.x, 0, state.position.z);
    sun.position.set(state.position.x - 55, 78, state.position.z - 32);
  }

  // ────────────────────────────────────────────────────────────────────────
  // 차고 3D 미리보기 렌더러
  // ────────────────────────────────────────────────────────────────────────
  const previewCanvas = $("#preview-canvas");
  const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  previewRenderer.outputEncoding = THREE.sRGBEncoding;
  previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  previewRenderer.toneMappingExposure = 1.1;
  const previewScene = new THREE.Scene();
  const previewCamera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  previewCamera.position.set(7.5, 4.6, 8.2);
  previewCamera.lookAt(0, 1, 0);
  previewScene.add(new THREE.HemisphereLight(0xe6f4ff, 0x334151, 2));
  const previewLight = new THREE.DirectionalLight(0xffffff, 2.2);
  previewLight.position.set(-4, 8, 6);
  previewScene.add(previewLight);
  const previewFloor = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshStandardMaterial({ color: 0x222b35, roughness: 1 }));
  previewFloor.rotation.x = -Math.PI / 2;
  previewScene.add(previewFloor);
  let previewVisual = null;

  function rebuildPreview() {
    if (previewVisual) previewScene.remove(previewVisual.root);
    const def = VEHICLES[previewIndex];
    const paint = previewIndex === selectedIndex ? selectedPaint : def.color;
    previewVisual = buildVehicleModel(def, paint, previewIndex === selectedIndex ? equipped : new Set());
    previewVisual.root.rotation.y = -.55;
    previewScene.add(previewVisual.root);
  }
  rebuildPreview();

  function resizePreview() {
    const width = Math.max(1, previewCanvas.clientWidth);
    const height = Math.max(1, previewCanvas.clientHeight);
    if (previewCanvas.width !== Math.round(width * previewRenderer.getPixelRatio()) || previewCanvas.height !== Math.round(height * previewRenderer.getPixelRatio())) {
      previewRenderer.setSize(width, height, false);
      previewCamera.aspect = width / height;
      previewCamera.updateProjectionMatrix();
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // UI: 메뉴, 차고, 장신구, 순간이동, 선물, 설정
  // ────────────────────────────────────────────────────────────────────────
  const drawer = $("#drawer");
  const startScreen = $("#start-screen");
  const pauseScreen = $("#pause-screen");
  let toastTimer = null;

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
  }

  function renderVehicleList() {
    $("#vehicle-list").innerHTML = VEHICLES.map((vehicleData, index) => `
      <button class="vehicle-card ${index === previewIndex ? "selected" : ""}" type="button" role="option"
        aria-selected="${index === previewIndex}" data-vehicle="${index}" style="--vehicle-color:#${vehicleData.color.toString(16).padStart(6,"0")}">
        <span class="vehicle-thumb ${vehicleData.type === "bike" ? "bike" : ""}"></span>
        <span><strong>${vehicleData.name}</strong><small>${vehicleData.className} · ${Math.round(vehicleData.maxSpeed * 3.6)} KM/H</small></span>
        <em class="owned">AVAILABLE</em>
      </button>`).join("");
    $$(".vehicle-card").forEach(card => card.addEventListener("click", () => {
      previewIndex = Number(card.dataset.vehicle);
      updateVehicleDetail();
      renderVehicleList();
    }));
  }

  function updateVehicleDetail() {
    const def = VEHICLES[previewIndex];
    $("#vehicle-number").textContent = String(previewIndex + 1).padStart(2, "0");
    $("#vehicle-name").textContent = def.name;
    $("#vehicle-class").textContent = def.className;
    $("#vehicle-description").textContent = def.description;
    $("#vehicle-stats").innerHTML = Object.entries(def.scores).map(([name, score]) => `
      <div class="stat-row"><span>${name}</span><i style="--score:${score}%"></i><b>${score}</b></div>`).join("");
    $("#select-vehicle").innerHTML = previewIndex === selectedIndex ? `현재 선택됨 <span>✓</span>` : `이 차량 선택 <span>→</span>`;
    rebuildPreview();
  }

  function renderAccessories() {
    $("#color-options").innerHTML = PAINTS.map(paint => `
      <button class="color-swatch ${paint.value === selectedPaint ? "selected" : ""}" type="button"
        aria-label="${paint.name}" title="${paint.name}" data-color="${paint.value}" style="--swatch:#${paint.value.toString(16).padStart(6,"0")}"></button>`).join("");
    $$(".color-swatch").forEach(button => button.addEventListener("click", () => {
      selectedPaint = Number(button.dataset.color);
      rebuildPlayerVehicle();
      rebuildPreview();
      renderAccessories();
      showToast("차량 컬러를 적용했습니다.");
    }));

    $("#accessory-options").innerHTML = ACCESSORIES.map(item => `
      <button class="accessory-item ${equipped.has(item.id) ? "selected" : ""}" type="button" data-accessory="${item.id}">
        <span>${item.icon}</span><div><b>${item.name}</b><small>${equipped.has(item.id) ? "장착됨" : "무료 장착"}</small></div>
      </button>`).join("");
    $$(".accessory-item").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.accessory;
      if (equipped.has(id)) equipped.delete(id); else equipped.add(id);
      rebuildPlayerVehicle();
      rebuildPreview();
      renderAccessories();
    }));
  }

  function renderDestinations() {
    $("#teleport-list").innerHTML = DESTINATIONS.map((destination, index) => `
      <button class="destination-card" type="button" data-destination="${index}">
        <span class="destination-art" style="--from:${destination.from};--to:${destination.to}">${destination.icon}</span>
        <div><h3>${destination.name}</h3><p>${destination.copy}</p></div>
      </button>`).join("");
    $$(".destination-card").forEach(button => button.addEventListener("click", () => {
      const destination = DESTINATIONS[Number(button.dataset.destination)];
      placeVehicle(destination.x, destination.z, destination.heading, `${destination.name}(으)로 이동했습니다.`);
      closeDrawer();
    }));
  }

  function openPanel(name) {
    uiOpen = true;
    clearKeys();
    drawer.classList.add("open");
    $$(".drawer-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panelContent === name));
    $$(".menu-button").forEach(button => button.classList.toggle("active", button.dataset.panel === name));
    if (name === "garage") setTimeout(resizePreview, 50);
  }

  function closeDrawer() {
    uiOpen = false;
    drawer.classList.remove("open");
  }

  $$(".menu-button").forEach(button => button.addEventListener("click", () => {
    if (!started) return;
    if (drawer.classList.contains("open") && button.classList.contains("active")) closeDrawer();
    else openPanel(button.dataset.panel);
  }));
  $("#drawer-close").addEventListener("click", closeDrawer);
  $(".drawer-backdrop").addEventListener("click", closeDrawer);

  $("#select-vehicle").addEventListener("click", () => {
    selectedIndex = previewIndex;
    selectedPaint = VEHICLES[selectedIndex].color;
    rebuildPlayerVehicle();
    updateVehicleDetail();
    renderVehicleList();
    renderAccessories();
    placeVehicle(state.position.x, state.position.z, state.heading);
    showToast(`${currentVehicle().name}(으)로 즉시 변경했습니다.`);
  });

  $("#spawn-button").addEventListener("click", () => placeVehicle(0, -12, 0, `${currentVehicle().name}을(를) 스폰했습니다.`));

  // 로컬 날짜만 저장하므로 로그인이나 결제가 전혀 필요 없습니다.
  const todayKey = new Date().toISOString().slice(0, 10);
  let giftClaimed = false;
  try { giftClaimed = localStorage.getItem("neon-trails-gift") === todayKey; } catch (_) { /* file:// 제한 시 메모리 상태만 사용 */ }
  function updateGift() {
    $("#claim-gift").disabled = giftClaimed;
    $("#claim-gift").textContent = giftClaimed ? "오늘 수령 완료 ✓" : "무료로 받기";
    $("#gift-copy").textContent = giftClaimed ? "내일 또 새로운 무료 보상을 확인하세요." : "별도 조건 없이 바로 받을 수 있습니다.";
  }
  $("#claim-gift").addEventListener("click", () => {
    if (giftClaimed) return;
    giftClaimed = true;
    selectedPaint = 0xf05a35;
    try { localStorage.setItem("neon-trails-gift", todayKey); } catch (_) { /* 저장 불가 환경에서도 보상은 적용 */ }
    rebuildPlayerVehicle();
    rebuildPreview();
    renderAccessories();
    updateGift();
    showToast("선셋 오렌지 컬러를 무료로 받았습니다!");
  });

  function applyQuality(value) {
    const ratio = value === "low" ? 1 : value === "medium" ? 1.35 : 1.65;
    renderer.setPixelRatio(Math.min(devicePixelRatio, ratio));
    renderer.shadowMap.enabled = value !== "low";
    sun.shadow.mapSize.set(value === "high" ? 2048 : 1024, value === "high" ? 2048 : 1024);
    sun.shadow.map?.dispose();
    showToast(`그래픽 품질: ${value === "high" ? "높음" : value === "medium" ? "중간" : "낮음"}`);
  }
  $("#quality-setting").addEventListener("change", event => applyQuality(event.target.value));
  $("#sensitivity-setting").addEventListener("input", event => { mouseSensitivity = Number(event.target.value) / 100; });
  $("#fullscreen-button").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) { showToast("이 브라우저에서는 전체 화면을 사용할 수 없습니다."); }
  });

  // ────────────────────────────────────────────────────────────────────────
  // 외부 음원 없는 Web Audio 엔진 사운드
  // ────────────────────────────────────────────────────────────────────────
  let audioContext = null;
  let engineOscillator = null;
  let engineGain = null;
  let soundEnabled = false;

  function ensureAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    engineOscillator = audioContext.createOscillator();
    engineGain = audioContext.createGain();
    engineOscillator.type = "sawtooth";
    engineOscillator.frequency.value = 45;
    engineGain.gain.value = 0;
    engineOscillator.connect(engineGain).connect(audioContext.destination);
    engineOscillator.start();
  }
  $("#sound-setting").addEventListener("change", async event => {
    ensureAudio();
    soundEnabled = event.target.checked;
    if (audioContext.state === "suspended") await audioContext.resume();
  });
  function updateAudio() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const ratio = Math.abs(state.velocity) / currentVehicle().maxSpeed;
    engineOscillator.frequency.setTargetAtTime(44 + ratio * 105 + (keys.w ? 11 : 0), now, .08);
    engineGain.gain.setTargetAtTime(soundEnabled && started && !paused && !uiOpen ? .012 + ratio * .026 : 0, now, .12);
  }

  // 키보드, 터치 입력. 폼 요소에 입력 중일 때는 게임 조작을 막습니다.
  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (["w","a","s","d","shift"," ","r","v","escape"].includes(key) && !["INPUT","SELECT"].includes(event.target.tagName)) event.preventDefault();
    if (key === "escape" && started) {
      if (drawer.classList.contains("open")) closeDrawer();
      else setPaused(!paused);
      return;
    }
    if (uiOpen || paused) return;
    if (key === "r") { resetVehicle(); return; }
    if (key === "v" && state.position.distanceTo(new THREE.Vector3(0, state.position.y, -12)) < 11) {
      placeVehicle(0, -12, 0, `${currentVehicle().name}을(를) 스폰했습니다.`);
      return;
    }
    if (key === " " && !event.repeat) jumpQueued = true;
    keys[key] = true;
  });
  window.addEventListener("keyup", event => { keys[event.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => { if (started && !paused && !uiOpen) setPaused(true); });

  $$("#mobile-controls button").forEach(button => {
    const set = value => {
      const key = button.dataset.key;
      keys[key] = value;
      if (key === " " && value) jumpQueued = true;
    };
    button.addEventListener("pointerdown", event => { event.preventDefault(); set(true); });
    button.addEventListener("pointerup", () => set(false));
    button.addEventListener("pointercancel", () => set(false));
  });

  function setPaused(value) {
    if (!started) return;
    paused = value;
    pauseScreen.classList.toggle("visible", paused);
    clearKeys();
  }
  $("#resume-button").addEventListener("click", () => setPaused(false));
  $("#pause-garage").addEventListener("click", () => {
    setPaused(false);
    openPanel("garage");
  });
  $("#start-button").addEventListener("click", () => {
    started = true;
    paused = false;
    startScreen.classList.remove("visible");
    showToast("시작 패드에서 V 키 또는 버튼으로 차량을 다시 소환할 수 있습니다.");
    lastTime = performance.now();
  });

  renderVehicleList();
  updateVehicleDetail();
  renderAccessories();
  renderDestinations();
  updateGift();

  // ────────────────────────────────────────────────────────────────────────
  // 메인 루프 / HUD / 반응형 리사이즈
  // ────────────────────────────────────────────────────────────────────────
  let lastTime = performance.now();
  let fpsFrames = 0;
  let fpsElapsed = 0;

  function updateUI(dt) {
    speedText.textContent = String(Math.round(Math.abs(state.velocity) * 3.6)).padStart(3, "0");
    fpsFrames += 1;
    fpsElapsed += dt;
    if (fpsElapsed > .45) {
      fpsText.textContent = String(Math.round(fpsFrames / fpsElapsed));
      fpsFrames = 0;
      fpsElapsed = 0;
    }
    jumpStatus.classList.toggle("locked", !state.grounded);
    jumpStatus.classList.toggle("ready", state.grounded);
    jumpStatus.querySelector("b").textContent = state.grounded ? "점프 가능" : "공중 이동 중";
    const distanceToPad = Math.hypot(state.position.x, state.position.z + 12);
    $("#interaction-prompt").classList.toggle("visible", started && !paused && !uiOpen && distanceToPad < 10);
    padRing.material.color.setHex(distanceToPad < 10 ? 0x6fffd0 : 0x16c7ff);
    padRing.rotation.z += dt * .35;
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (started && !paused && !uiOpen) updatePhysics(dt);
    updateCamera(dt);
    updateUI(dt);
    updateAudio();
    if (previewVisual) previewVisual.root.rotation.y += dt * .28;
    if (drawer.classList.contains("open") && $(".drawer-panel.active")?.dataset.panelContent === "garage") {
      resizePreview();
      previewRenderer.render(previewScene, previewCamera);
    }
    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, $("#quality-setting").value === "high" ? 1.65 : 1.3));
    resizePreview();
  }
  window.addEventListener("resize", onResize);

  placeVehicle(0, -12, 0);
  updateCamera(1);
  loading.classList.remove("visible");
  requestAnimationFrame(animate);
})();
