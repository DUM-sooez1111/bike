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

  // 기존 5개 차종을 기준으로 카테고리마다 50대씩 추가합니다.
  // 차체는 로우폴리 부품을 재사용하고 색상·성능·가격만 데이터로 생성해 로딩을 가볍게 유지합니다.
  const VEHICLE_SERIES = [
    { type: "car", className: "RALLY", prefix: "Trail", words: ["Fox", "Storm", "Ridge", "Dash", "Nomad"], base: { speed: 38, acceleration: 17, braking: 34, handling: 1.72 } },
    { type: "super", className: "SPORT", prefix: "Apex", words: ["R", "Nova", "Pulse", "Velo", "GT"], base: { speed: 48, acceleration: 21, braking: 39, handling: 1.48 } },
    { type: "buggy", className: "OFFROAD", prefix: "Dust", words: ["Bug", "Ranger", "Hopper", "Claw", "Dune"], base: { speed: 35, acceleration: 19, braking: 32, handling: 1.95 } },
    { type: "roadster", className: "CRUISER", prefix: "City", words: ["Glide", "Breeze", "Flow", "Lumen", "Coast"], base: { speed: 41, acceleration: 16, braking: 36, handling: 1.78 } },
    { type: "bike", className: "BIKE", prefix: "Volt", words: ["Rider", "Spark", "Arrow", "Whirl", "Bolt"], base: { speed: 44, acceleration: 23, braking: 30, handling: 2.08 } },
    { type: "truck", className: "TRUCK", prefix: "Titan", words: ["Hauler", "Cargo", "Torque", "Road", "Max"], base: { speed: 34, acceleration: 13, braking: 40, handling: 1.25 } },
    { type: "van", className: "VAN", prefix: "Metro", words: ["Mover", "Box", "Tour", "Cargo", "Shuttle"], base: { speed: 38, acceleration: 15, braking: 38, handling: 1.52 } },
    { type: "kart", className: "KART", prefix: "Mini", words: ["Rocket", "Dash", "Sprint", "Zip", "Racer"], base: { speed: 42, acceleration: 24, braking: 32, handling: 2.35 } },
    { type: "atv", className: "ATV", prefix: "Quad", words: ["Climber", "Mud", "Trail", "Ridge", "Storm"], base: { speed: 36, acceleration: 21, braking: 34, handling: 2.12 } }
  ];

  const scoreFromRange = (value, low, high) =>
    Math.round(THREE.MathUtils.clamp((value - low) / (high - low) * 70 + 30, 30, 100));

  VEHICLE_SERIES.forEach((series, categoryIndex) => {
    for (let number = 1; number <= 50; number += 1) {
      const tier = (number - 1) / 49;
      const wave = Math.sin(number * 1.73 + categoryIndex) * .5 + .5;
      const maxSpeed = series.base.speed + tier * 16 + wave * 2.4;
      const acceleration = series.base.acceleration + tier * 8 + (1 - wave) * 1.7;
      const braking = series.base.braking + tier * 11 + wave * 2;
      const handling = series.base.handling + tier * .22 + (wave - .5) * .12;
      const performance = maxSpeed * 34 + acceleration * 48 + braking * 21 + handling * 620;
      const price = Math.round((900 + performance * (1.25 + tier * 1.55)) / 50) * 50;
      const color = new THREE.Color().setHSL((categoryIndex * .19 + number * .047) % 1, .68, .53).getHex();
      VEHICLES.push({
        id: `${series.type}-${String(number).padStart(2, "0")}`,
        name: `${series.prefix} ${series.words[(number - 1) % series.words.length]} ${String(number).padStart(2, "0")}`,
        type: series.type,
        className: `${series.className} T${Math.min(5, Math.ceil(number / 10))}`,
        color,
        maxSpeed,
        acceleration,
        braking,
        handling,
        price,
        generated: true,
        description: `${series.className} 계열 ${number}번 모델. 등급에 따라 성능과 가격이 함께 상승합니다.`,
        scores: {
          "최고속도": scoreFromRange(maxSpeed, 32, 66),
          "가속력": scoreFromRange(acceleration, 14, 33),
          "제동력": scoreFromRange(braking, 28, 50),
          "핸들링": scoreFromRange(handling, 1.35, 2.4)
        }
      });
    }
  });

  // 차고는 무료 차량부터 시작해 가격이 낮은 순서로 고정 정렬합니다.
  const GARAGE_ORDER = VEHICLES
    .map((vehicleData, index) => ({ vehicleData, index }))
    .sort((a, b) =>
      (a.vehicleData.price || 0) - (b.vehicleData.price || 0) ||
      a.vehicleData.name.localeCompare(b.vehicleData.name)
    );
  const GARAGE_CATEGORIES = [
    ["all", "전체"],
    ["car", "랠리"],
    ["super", "스포츠"],
    ["buggy", "버기"],
    ["roadster", "로드스터"],
    ["bike", "바이크"],
    ["truck", "트럭"],
    ["van", "밴"],
    ["kart", "카트"],
    ["atv", "ATV"]
  ];
  let garageCategory = "all";

  // 차량 ID로 고유한 외형 값을 만듭니다. 같은 차량은 재실행 후에도 같은 모습입니다.
  function getVehicleVisualSpec(definition) {
    let hash = 2166136261;
    for (const character of definition.id) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    hash >>>= 0;
    const unit = shift => ((hash >>> shift) & 255) / 255;
    const accentColor = new THREE.Color(definition.color);
    accentColor.offsetHSL(.12 + unit(8) * .34, .05, unit(16) > .5 ? .13 : -.15);
    return {
      hash,
      variant: hash % 8,
      feature: (hash >>> 5) % 6,
      accent: accentColor.getHex(),
      widthScale: .9 + unit(0) * .22,
      lengthScale: .9 + unit(8) * .22,
      heightScale: .88 + unit(16) * .25,
      wheelScale: .9 + unit(24) * .2,
      cabinShift: (unit(4) - .5) * .42,
      thumbWidth: 42 + Math.round(unit(0) * 13),
      thumbHeight: 14 + Math.round(unit(16) * 8),
      thumbSkew: -7 + Math.round(unit(8) * 14),
      corner: 3 + Math.round(unit(24) * 10)
    };
  }

  function getGarageCardStyle(definition) {
    const visual = getVehicleVisualSpec(definition);
    return [
      `--vehicle-color:#${definition.color.toString(16).padStart(6, "0")}`,
      `--vehicle-accent:#${visual.accent.toString(16).padStart(6, "0")}`,
      `--thumb-width:${visual.thumbWidth}px`,
      `--thumb-height:${visual.thumbHeight}px`,
      `--thumb-skew:${visual.thumbSkew}deg`,
      `--thumb-corner:${visual.corner}px`
    ].join(";");
  }

  function getGarageThumbClass(definition) {
    const visual = getVehicleVisualSpec(definition);
    return `type-${definition.type} variant-${visual.variant}`;
  }

  const DESTINATIONS = [
    { name: "시작 캠프", copy: "차량 스폰 패드와 초보 연습장", icon: "🏁", x: 0, z: -12, heading: 0, unlockMinutes: 0 },
    { name: "메가 점프장", copy: "북쪽의 가장 높은 점프 코스", icon: "🚀", x: -38, z: 100, heading: Math.PI, unlockMinutes: 0 },
    { name: "동쪽 레이싱 트랙", copy: "빠른 속도를 시험하는 타원형 서킷", icon: "🏎️", x: 73, z: 3, heading: Math.PI / 2, unlockMinutes: 13 },
    { name: "북서쪽 장애물 코스", copy: "도로와 분리된 벽·콘 연습 구역", icon: "🚧", x: -155, z: 62, heading: 0, unlockMinutes: 28 },
    { name: "서쪽 바람 평원", copy: "긴 흙길과 대형 점프대가 있는 외곽 초원", icon: "🌬️", x: -270, z: 42, heading: -Math.PI / 2, unlockMinutes: 18 },
    { name: "남쪽 소나무 숲", copy: "코인과 바위가 흩어진 깊은 숲길", icon: "🌲", x: 68, z: -292, heading: 0, unlockMinutes: 43 },
    { name: "푸른 호수 전망대", copy: "서남쪽 호수와 언덕을 둘러보는 장소", icon: "🏞️", x: -258, z: -138, heading: Math.PI, unlockMinutes: 0 },
    { name: "큰강 다리", copy: "강을 안전하게 건너는 중앙 다리", icon: "🌉", x: 85, z: 176, heading: 0, unlockMinutes: 0 },
    { name: "동쪽 고원", copy: "넓은 맵을 내려다보는 주행 가능한 언덕", icon: "⛰️", x: 246, z: -125, heading: 0, unlockMinutes: 0 }
  ];

  DESTINATIONS.push(
    { name: "북쪽 대평원", copy: "확장된 맵의 북쪽 끝을 달리는 넓은 초원", icon: "🧭", x: 80, z: 575, heading: Math.PI, unlockMinutes: 0 },
    { name: "동쪽 황야", copy: "긴 도로와 거대한 언덕이 이어지는 외곽 지역", icon: "🏜️", x: 585, z: -265, heading: -Math.PI / 2, unlockMinutes: 0 },
    { name: "서쪽 끝자락", copy: "초장거리 직선 도로의 서쪽 종점", icon: "🌄", x: -620, z: 42, heading: Math.PI / 2, unlockMinutes: 0 },
    { name: "거대 설산", copy: "아주 높고 가파른 산을 정상까지 오르는 극한 코스", icon: "🏔️", x: -540, z: -405, heading: Math.PI, unlockMinutes: 0 }
  );

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
    { id: "spoiler", icon: "🏁", name: "스포츠 스포일러", excludeTypes: ["bike"] },
    { id: "antenna", icon: "📡", name: "탐험 안테나" }
  ];

  // 참고 이미지의 시간을 분 단위로 올림한 3·8·13·18·28·43·58분 보상입니다.
  const SESSION_REWARDS = [
    { minute: 3, icon: "🍎", name: "루비 레드 컬러", copy: "레드 페인트 + 100 크레딧", paint: 0xf05a35, credits: 100 },
    { minute: 8, icon: "🎨", name: "민트 러시 컬러", copy: "민트 페인트 + 250 크레딧", paint: 0x52d39a, credits: 250 },
    { minute: 13, icon: "🦴", name: "탐험 안테나", copy: "무료 장신구 + 400 크레딧", accessory: "antenna", credits: 400 },
    { minute: 18, icon: "🍔", name: "트레일 깃발", copy: "무료 장신구 + 600 크레딧", accessory: "flag", credits: 600 },
    { minute: 28, icon: "✨", name: "루프 라이트", copy: "무료 장신구 + 1,000 크레딧", accessory: "lights", credits: 1000 },
    { minute: 43, icon: "🎆", name: "스포츠 스포일러", copy: "무료 장신구 + 2,000 크레딧", accessory: "spoiler", credits: 2000 },
    { minute: 58, icon: "🧊", name: "풀 커스텀 팩", copy: "모든 장신구 + 5,000 크레딧", all: true, featured: true, credits: 5000 }
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const canvas = $("#game-canvas");
  const loading = $("#loading");
  const speedText = $("#speed");
  const fpsText = $("#fps");
  const driftStatus = $("#drift-status");
  const boostStatus = $("#boost-status");
  const boostValue = $("#boost-value");
  const moneyText = $("#money");
  // 기존 800×800 맵을 1400×1400으로 확장합니다.
  const WORLD_HALF_SIZE = 700;
  const WORLD_SIZE = WORLD_HALF_SIZE * 2;
  const SAVE_KEY = "neon-trails-save-v1";
  let savedGame = {};
  try {
    const parsedSave = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    if (parsedSave && typeof parsedSave === "object") savedGame = parsedSave;
  } catch (error) {
    console.warn("저장 데이터를 읽지 못해 새 게임으로 시작합니다.", error);
  }

  let credits = 0;
  try {
    const legacyCredits = Number(localStorage.getItem("neon-trails-credits")) || 0;
    credits = Math.max(0, Number(savedGame.credits) || legacyCredits);
  } catch (_) { /* 저장 제한 환경에서는 현재 실행 중에만 유지 */ }

  function updateMoneyDisplay() {
    moneyText.textContent = new Intl.NumberFormat("ko-KR").format(Math.floor(credits));
  }

  function addCredits(amount, reason = "", notifyPlayer = true) {
    credits = Math.max(0, credits + Math.floor(amount));
    updateMoneyDisplay();
    try { localStorage.setItem("neon-trails-credits", String(credits)); } catch (_) { /* file:// 저장 제한 허용 */ }
    saveGame(false);
    const chip = $(".money-chip");
    chip.classList.remove("bump");
    requestAnimationFrame(() => chip.classList.add("bump"));
    if (notifyPlayer) showToast(`+${amount.toLocaleString("ko-KR")} 크레딧${reason ? ` · ${reason}` : ""}`);
  }
  updateMoneyDisplay();

  // ────────────────────────────────────────────────────────────────────────
  // 렌더러 / 씬 / 조명
  // ────────────────────────────────────────────────────────────────────────
  function qualityPixelRatio(value) {
    const limit = value === "low" ? 1.2 : value === "medium" ? 1.45 : 1.8;
    return Math.min(devicePixelRatio, limit);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(qualityPixelRatio("high"));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x91cbed);
  scene.fog = new THREE.Fog(0x9bcde3, 240, 980);

  const camera = new THREE.PerspectiveCamera(59, innerWidth / innerHeight, 0.1, 1200);
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
    new THREE.SphereGeometry(1800, 24, 12),
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
  const terrainSurfaces = [];
  const waterZones = [];
  const roadSegments = [];
  const WATER_LEVEL = .18;

  // 물가를 실제로 파낼 수 있도록 지면을 촘촘한 격자로 만듭니다.
  const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE + 30, WORLD_SIZE + 30, 220, 220);
  const ground = new THREE.Mesh(groundGeometry, MAT.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  // 잔디의 단조로움을 깨는 큰 다각형 패치
  const patchGeo = new THREE.CircleGeometry(1, 7);
  const groundPatches = [];
  for (let i = 0; i < 560; i += 1) {
    const patch = new THREE.Mesh(patchGeo, i % 5 === 0 ? MAT.dirt : (i % 2 ? MAT.grassLight : MAT.grassDark));
    patch.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    patch.position.set((Math.random() - .5) * (WORLD_SIZE - 24), .008, (Math.random() - .5) * (WORLD_SIZE - 24));
    patch.scale.set(3 + Math.random() * 7, 1.5 + Math.random() * 3.5, 1);
    world.add(patch);
    groundPatches.push(patch);
  }

  function addBox(x, y, z, width, height, depth, material, rotationY = 0, collision = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    world.add(mesh);
    if (collision) {
      // 회전된 상자도 빠지지 않도록 월드 기준 AABB를 계산합니다.
      const c = Math.abs(Math.cos(rotationY));
      const s = Math.abs(Math.sin(rotationY));
      const extentX = (width * c + depth * s) / 2;
      const extentZ = (width * s + depth * c) / 2;
      colliders.push({ minX: x - extentX, maxX: x + extentX, minZ: z - extentZ, maxZ: z + extentZ, maxY: y + height / 2 });
    }
    return mesh;
  }

  // 외곽 벽
  addBox(0, 1.2, -WORLD_HALF_SIZE, WORLD_SIZE, 2.4, 2.3, MAT.concrete);
  addBox(0, 1.2, WORLD_HALF_SIZE, WORLD_SIZE, 2.4, 2.3, MAT.concrete);
  addBox(-WORLD_HALF_SIZE, 1.2, 0, 2.3, 2.4, WORLD_SIZE, MAT.concrete);
  addBox(WORLD_HALF_SIZE, 1.2, 0, 2.3, 2.4, WORLD_SIZE, MAT.concrete);

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

  function isDriveLane(x, z, clearance = 0) {
    const ellipse = Math.sqrt(
      ((x - trackCenter.x) / 48) ** 2 +
      ((z - trackCenter.z) / 31) ** 2
    );
    const onTrack = ellipse > .78 - clearance * .012 && ellipse < 1.24 + clearance * .012;
    const onWestRoad = x > -304 && x < -132 && Math.abs(z - 42) < 7 + clearance;
    const onSouthRoad = z > -304 && z < -132 && Math.abs(x - 68) < 7 + clearance;
    const onBridge = x > 72 - clearance && x < 98 + clearance && z > 164 && z < 246;
    const atSpawn = Math.hypot(x, z + 12) < 11 + clearance;
    const onAddedRoad = roadSegments.some(segment => {
      const segmentX = segment.bx - segment.ax;
      const segmentZ = segment.bz - segment.az;
      const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
      const projection = lengthSquared > .001
        ? ((x - segment.ax) * segmentX + (z - segment.az) * segmentZ) / lengthSquared
        : 0;
      const t = THREE.MathUtils.clamp(projection, 0, 1);
      const closestX = segment.ax + segmentX * t;
      const closestZ = segment.az + segmentZ * t;
      return Math.hypot(x - closestX, z - closestZ) < segment.width / 2 + clearance;
    });
    return onTrack || onWestRoad || onSouthRoad || onBridge || atSpawn || onAddedRoad;
  }

  // 여러 지점을 잇는 도로를 만들고 나무·돌 생성 제외 구역에도 등록합니다.
  function addRoadPath(points, width = 10, material = MAT.road) {
    const controlPoints = points.map(([x, z]) => new THREE.Vector3(x, .038, z));
    const curve = new THREE.CatmullRomCurve3(controlPoints, false, "centripetal", .5);
    const roughLength = points.slice(1).reduce((total, point, index) =>
      total + Math.hypot(point[0] - points[index][0], point[1] - points[index][1]), 0);
    const samples = curve.getPoints(Math.max(8, Math.ceil(roughLength / 9)));
    const positions = [];
    const indices = [];

    samples.forEach((point, index) => {
      const previous = samples[Math.max(0, index - 1)];
      const next = samples[Math.min(samples.length - 1, index + 1)];
      const tangentX = next.x - previous.x;
      const tangentZ = next.z - previous.z;
      const tangentLength = Math.max(Math.hypot(tangentX, tangentZ), .001);
      const sideX = tangentZ / tangentLength;
      const sideZ = -tangentX / tangentLength;
      positions.push(
        point.x + sideX * width / 2, point.y, point.z + sideZ * width / 2,
        point.x - sideX * width / 2, point.y, point.z - sideZ * width / 2
      );
      if (index < samples.length - 1) {
        const offset = index * 2;
        indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
      }
      if (index > 0) {
        const previousPoint = samples[index - 1];
        roadSegments.push({
          ax: previousPoint.x, az: previousPoint.z,
          bx: point.x, bz: point.z,
          width
        });
      }
    });

    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    roadGeometry.setIndex(indices);
    roadGeometry.computeVertexNormals();
    const roadMaterial = material.clone();
    roadMaterial.side = THREE.DoubleSide;
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.receiveShadow = true;
    world.add(road);

    if (material === MAT.road) {
      const centerLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(samples.map(point =>
          new THREE.Vector3(point.x, point.y + .045, point.z)
        )),
        new THREE.LineDashedMaterial({ color: 0xf4ead1, dashSize: 4.2, gapSize: 6.2 })
      );
      centerLine.computeLineDistances();
      world.add(centerLine);
    }
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
  addRamp(-286, 42, Math.PI / 2, 13, 24, 7.2);
  addRamp(68, -276, 0, 10, 19, 5.5);
  addRamp(-575, 42, Math.PI / 2, 13, 25, 7.5);
  addRamp(68, -575, 0, 11, 22, 6.5);
  addRamp(545, 430, -Math.PI / 2, 12, 22, 6.8);

  // 시작점에서 트랙, 다리, 호수, 산과 외곽 지역까지 이어지는 도로망입니다.
  addRoadPath([[0,-12],[18,-6],[35,3]], 11);
  addRoadPath([[68,34],[72,72],[78,112],[83,150],[85,166]], 10);
  addRoadPath([[23,8],[-20,18],[-72,32],[-132,42],[-210,42],[-295,42],[-390,42],[-490,42],[-620,42]], 10);
  addRoadPath([[68,-26],[68,-82],[68,-145],[68,-215],[68,-295],[68,-390],[68,-490],[68,-620]], 10);
  addRoadPath([[-218,42],[-225,-10],[-235,-62],[-244,-108],[-239,-142],[-325,-150],[-405,-195],[-485,-255],[-565,-315]], 9);
  addRoadPath([[108,-15],[150,-30],[190,-48],[218,-65],[235,-125],[330,-175],[440,-220],[585,-265]], 9);
  addRoadPath([[85,244],[42,252],[-18,258],[-82,260],[-150,258],[-175,315],[-285,330],[-405,375],[-575,430]], 10);
  addRoadPath([[105,245],[185,275],[275,315],[380,360],[545,430]], 10);
  addRoadPath([[42,252],[35,340],[52,430],[75,515],[80,620]], 10);
  addRoadPath([[-565,-315],[-565,-355],[-555,-385],[-540,-405]], 11, MAT.dirt);

  // 새 외곽 지역으로 이어지는 긴 흙길입니다.
  addBox(-218, .025, 42, 155, .05, 10, MAT.dirt, 0, false);
  addBox(68, .025, -218, 10, .05, 150, MAT.dirt, 0, false);

  // 도로와 트랙을 막지 않는 북서쪽 전용 장애물 연습 구역
  [
    [-145, 1.6, 78, 9, 3.2, 3, MAT.concrete],
    [-166, 1.3, 96, 4, 2.6, 13, MAT.orange],
    [-127, 1.8, 118, 11, 3.6, 3, MAT.concrete],
    [-184, 2, 126, 4, 4, 13, MAT.yellow],
    [-151, 2.5, 146, 5.5, 5, 5.5, MAT.concreteDark],
    [-205, 1.5, 88, 10, 3, 4, MAT.concrete],
    [-116, 1.1, 151, 18, 2.2, 3, MAT.concrete]
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
    colliders.push({ minX: x - .48, maxX: x + .48, minZ: z - .48, maxZ: z + .48, maxY: 1.3 });
  }
  for (let z = 76; z <= 148; z += 9) addCone(-155 + (Math.round(z / 9) % 2 ? -9 : 9), z);

  // 캔버스로 만든 경고 이미지라서 별도 이미지 파일이나 인터넷 연결이 필요 없습니다.
  function addObstacleSign(x, z, rotationY = 0) {
    const signCanvas = document.createElement("canvas");
    signCanvas.width = 256;
    signCanvas.height = 160;
    const ctx = signCanvas.getContext("2d");
    ctx.fillStyle = "#f6c247";
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = "#171d20";
    ctx.fillRect(0, 0, 256, 16);
    ctx.fillRect(0, 144, 256, 16);
    ctx.font = "bold 74px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⚠", 128, 84);
    ctx.font = "bold 27px sans-serif";
    ctx.fillText("장애물 구역", 128, 128);
    const signMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas), side: THREE.DoubleSide });
    const group = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3), signMaterial);
    board.position.y = 3.6;
    const pole = new THREE.Mesh(new THREE.BoxGeometry(.28, 3.8, .28), MAT.dark);
    pole.position.y = 1.9;
    group.add(board, pole);
    group.position.set(x, 0, z);
    group.rotation.y = rotationY;
    world.add(group);
    colliders.push({ minX: x - .45, maxX: x + .45, minZ: z - .45, maxZ: z + .45, maxY: 5.1 });
  }
  addObstacleSign(-133, 66, Math.PI);
  addObstacleSign(-194, 156, 0);

  // 여러 지형: 운전 가능한 언덕, 호수, 강, 그리고 강을 건너는 다리
  function addHill(x, z, radius, height, material = MAT.grassDark) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 10, 4), material);
    hill.position.set(x, height / 2 - .05, z);
    hill.rotation.y = Math.PI / 10;
    hill.castShadow = true;
    hill.receiveShadow = true;
    world.add(hill);
    terrainSurfaces.push({ type: "hill", x, z, radius, height });
  }

  function addGiantMountain(x, z, radius, height) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 12, 5),
      MAT.concreteDark
    );
    mountain.position.set(x, height / 2 - .05, z);
    mountain.rotation.y = Math.PI / 12;
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    world.add(mountain);

    // 본체와 같은 경사를 가진 작은 원뿔을 겹쳐 자연스러운 눈 덮인 정상을 만듭니다.
    const snowHeight = height * .34;
    const snowRadius = radius * (snowHeight / height);
    const snowCap = new THREE.Mesh(
      new THREE.ConeGeometry(snowRadius, snowHeight, 12, 3),
      MAT.white
    );
    snowCap.position.set(x, height - snowHeight / 2 - .03, z);
    snowCap.rotation.y = mountain.rotation.y;
    snowCap.castShadow = true;
    snowCap.receiveShadow = true;
    world.add(snowCap);
    terrainSurfaces.push({ type: "hill", x, z, radius, height, giant: true });
  }
  addHill(-282, -52, 37, 17);
  addHill(246, -82, 48, 24, MAT.grassLight);
  addHill(275, 135, 31, 14);
  addHill(-212, 258, 42, 20, MAT.grassDark);
  addHill(-525, -365, 62, 29, MAT.grassDark);
  addHill(520, -345, 70, 34, MAT.grassLight);
  addHill(490, 515, 58, 27, MAT.grassDark);
  addHill(-485, 505, 68, 33, MAT.grassLight);
  addHill(0, 575, 50, 24, MAT.grassDark);
  addGiantMountain(-520, -535, 120, 112);

  function overlapsHill(x, z, clearance = 0) {
    return terrainSurfaces.some(terrain =>
      terrain.type === "hill" &&
      Math.hypot(x - terrain.x, z - terrain.z) < terrain.radius + clearance
    );
  }

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f9fca, roughness: .22, metalness: .08, transparent: true, opacity: .66,
    depthWrite: false, side: THREE.DoubleSide, flatShading: true
  });
  const lakeShore = new THREE.Mesh(new THREE.RingGeometry(44, 49, 24), MAT.dirt);
  lakeShore.rotation.x = -Math.PI / 2;
  lakeShore.position.set(-258, .025, -185);
  lakeShore.scale.set(1.3, .78, 1);
  lakeShore.receiveShadow = true;
  world.add(lakeShore);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(44, 20), waterMaterial);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(-258, WATER_LEVEL, -185);
  lake.scale.set(1.3, .78, 1);
  lake.receiveShadow = true;
  world.add(lake);
  waterZones.push({ type: "ellipse", x: -258, z: -185, radiusX: 57, radiusZ: 34, waterLevel: WATER_LEVEL });

  // 굽이치는 강: 강둑, 수면, 물가 선을 같은 곡선에서 생성해 자연스럽게 이어 붙입니다.
  const riverCenterZ = x => 205 + Math.sin((x - 85) * .018) * 10 + Math.sin((x - 85) * .041) * 3;
  const riverWidth = x => 23 + Math.sin(x * .026) * 3.5;
  const riverSamples = [];
  for (let index = 0; index <= 70; index += 1) {
    const x = THREE.MathUtils.lerp(-690, 690, index / 70);
    riverSamples.push({ x, z: riverCenterZ(x), halfWidth: riverWidth(x) / 2 });
  }

  function createRiverRibbon(extraWidth, y, material) {
    const positions = [];
    const indices = [];
    riverSamples.forEach(point => {
      positions.push(point.x, y, point.z - point.halfWidth - extraWidth);
      positions.push(point.x, y, point.z + point.halfWidth + extraWidth);
    });
    for (let index = 0; index < riverSamples.length - 1; index += 1) {
      const offset = index * 2;
      indices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    world.add(mesh);
    return mesh;
  }

  createRiverRibbon(4.5, .018, MAT.dirt);
  const riverMaterial = new THREE.MeshStandardMaterial({
    color: 0x238fc4,
    emissive: 0x073f5d,
    emissiveIntensity: .18,
    roughness: .28,
    metalness: .04,
    transparent: true,
    opacity: .68,
    depthWrite: false,
    side: THREE.DoubleSide,
    flatShading: true
  });
  createRiverRibbon(0, WATER_LEVEL - .05, riverMaterial);

  const bankLineMaterial = new THREE.LineBasicMaterial({ color: 0xb8ecf3, transparent: true, opacity: .8 });
  [-1, 1].forEach(side => {
    const points = riverSamples.map(point =>
      new THREE.Vector3(point.x, WATER_LEVEL - .035, point.z + side * point.halfWidth)
    );
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), bankLineMaterial));
  });

  // 물 충돌도 곡선을 따라가되 다리 아래는 통과할 수 있도록 비워 둡니다.
  for (let index = 0; index < riverSamples.length - 1; index += 1) {
    const a = riverSamples[index];
    const b = riverSamples[index + 1];
    waterZones.push({
      type: "capsule",
      ax: a.x, az: a.z,
      bx: b.x, bz: b.z,
      radius: (a.halfWidth + b.halfWidth) / 2,
      waterLevel: WATER_LEVEL - .05
    });
  }

  function waterDepthAt(x, z) {
    let depth = 0;
    for (const zone of waterZones) {
      let normalizedDistance = 2;
      let maxDepth = 0;
      if (zone.type === "ellipse") {
        normalizedDistance = Math.hypot(
          (x - zone.x) / zone.radiusX,
          (z - zone.z) / zone.radiusZ
        );
        maxDepth = 3.8;
      } else if (zone.type === "capsule") {
        const segmentX = zone.bx - zone.ax;
        const segmentZ = zone.bz - zone.az;
        const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
        const projection = lengthSquared > .001
          ? ((x - zone.ax) * segmentX + (z - zone.az) * segmentZ) / lengthSquared
          : 0;
        const t = THREE.MathUtils.clamp(projection, 0, 1);
        const closestX = zone.ax + segmentX * t;
        const closestZ = zone.az + segmentZ * t;
        normalizedDistance = Math.hypot(x - closestX, z - closestZ) / zone.radius;
        maxDepth = 2.35;
      }
      if (normalizedDistance >= 1) continue;
      const shoreStart = zone.type === "ellipse" ? .7 : .52;
      const progress = THREE.MathUtils.clamp((1 - normalizedDistance) / (1 - shoreStart), 0, 1);
      const smoothProgress = progress * progress * (3 - 2 * progress);
      depth = Math.max(depth, maxDepth * smoothProgress);
    }
    return depth;
  }

  function getWaterBedInfo(position) {
    const depth = waterDepthAt(position.x, position.z);
    if (depth <= .001) return null;
    const sample = .55;
    const heightX1 = -waterDepthAt(position.x + sample, position.z);
    const heightX0 = -waterDepthAt(position.x - sample, position.z);
    const heightZ1 = -waterDepthAt(position.x, position.z + sample);
    const heightZ0 = -waterDepthAt(position.x, position.z - sample);
    return {
      height: -depth,
      pitch: 0,
      gradientX: (heightX1 - heightX0) / (sample * 2),
      gradientZ: (heightZ1 - heightZ0) / (sample * 2),
      ramp: null,
      terrain: null,
      progress: depth,
      water: true
    };
  }

  // 지면 버텍스를 수중 바닥 높이까지 내려 호수와 강의 분지를 실제로 만듭니다.
  const groundPositions = groundGeometry.attributes.position;
  for (let index = 0; index < groundPositions.count; index += 1) {
    const worldX = groundPositions.getX(index);
    const worldZ = -groundPositions.getY(index);
    groundPositions.setZ(index, -waterDepthAt(worldX, worldZ));
  }
  groundPositions.needsUpdate = true;
  groundGeometry.computeVertexNormals();

  function addBridgeApproach(z, rotationY) {
    const width = 14;
    const length = 14;
    const height = 1.4;
    const mesh = new THREE.Mesh(createRampGeometry(width, length, height), MAT.road);
    mesh.position.set(85, 0, z);
    mesh.rotation.y = rotationY;
    mesh.receiveShadow = true;
    world.add(mesh);
    terrainSurfaces.push({ type: "slope", x: 85, z, rotationY, width, length, height });
  }

  // 얇은 다리 상판과 양쪽 완만한 진입로를 연결해 수직 턱을 없앱니다.
  addBox(85, .03, 166, 14, .06, 14, MAT.road, 0, false);
  addBridgeApproach(180, 0);
  addBox(85, 1.21, 205, 14, .38, 36, MAT.road, 0, false);
  addBridgeApproach(230, Math.PI);
  addBox(85, .03, 244, 14, .06, 14, MAT.road, 0, false);
  addBox(78.55, 1.74, 205, .32, .68, 36, MAT.yellow);
  addBox(91.45, 1.74, 205, .32, .68, 36, MAT.yellow);
  addBox(85, 1.415, 205, .22, .03, 34, MAT.roadEdge, 0, false);
  terrainSurfaces.push({ type: "box", minX: 78, maxX: 92, minZ: 187, maxZ: 223, height: 1.4 });

  // 나무와 돌이 호수·강 안이나 물가에 겹쳐 생성되지 않도록 여유 공간까지 검사합니다.
  function overlapsWater(x, z, clearance = 0) {
    return waterZones.some(zone => {
      if (zone.type === "ellipse") {
        const nx = (x - zone.x) / (zone.radiusX + clearance);
        const nz = (z - zone.z) / (zone.radiusZ + clearance);
        return nx * nx + nz * nz < 1;
      }
      if (zone.type === "capsule") {
        const segmentX = zone.bx - zone.ax;
        const segmentZ = zone.bz - zone.az;
        const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
        const projection = lengthSquared > .001
          ? ((x - zone.ax) * segmentX + (z - zone.az) * segmentZ) / lengthSquared
          : 0;
        const t = THREE.MathUtils.clamp(projection, 0, 1);
        const closestX = zone.ax + segmentX * t;
        const closestZ = zone.az + segmentZ * t;
        return Math.hypot(x - closestX, z - closestZ) < zone.radius + clearance;
      }
      return (
        x >= zone.minX - clearance && x <= zone.maxX + clearance &&
        z >= zone.minZ - clearance && z <= zone.maxZ + clearance
      );
    });
  }

  groundPatches.forEach(patch => {
    if (
      overlapsWater(patch.position.x, patch.position.z, 1.5) ||
      isDriveLane(patch.position.x, patch.position.z, 1.2)
    ) world.remove(patch);
  });

  function addTree(x, z, scale = 1) {
    if (
      isDriveLane(x, z, 2.5 * scale) ||
      overlapsHill(x, z, 2.8 * scale) ||
      overlapsWater(x, z, 3.2 * scale)
    ) return null;
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
    const trunkRadius = .62 * scale;
    colliders.push({ minX: x - trunkRadius, maxX: x + trunkRadius, minZ: z - trunkRadius, maxZ: z + trunkRadius, maxY: 5.6 * scale });
    return group;
  }

  [
    [-116,-105,1.4],[-92,-112,1],[-113,-62,1.2],[-108,24,1.4],[-119,88,1],
    [-85,117,1.3],[-15,122,1.2],[45,117,1.45],[112,101,1.1],[122,48,1.35],
    [119,-14,1.1],[119,-92,1.4],[73,-118,1.1],[15,-124,1.35],[-45,-119,1.05],
    [-78,68,.9],[-18,52,1.1],[26,-82,1.2],[-93,15,1.1]
  ].forEach(p => addTree(...p));

  // 확장된 외곽 지역에도 듬성듬성 숲을 배치해 넓어진 공간의 깊이감을 유지합니다.
  for (let i = 0; i < 42; i += 1) {
    const angle = i / 42 * Math.PI * 2 + (Math.random() - .5) * .08;
    const radius = 158 + Math.random() * 68;
    addTree(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      .85 + Math.random() * .65
    );
  }

  // 800×800으로 넓어진 새 외곽 숲. 경계까지 풍경이 비지 않도록 두 겹으로 배치합니다.
  for (let i = 0; i < 92; i += 1) {
    const angle = i / 92 * Math.PI * 2 + (Math.random() - .5) * .075;
    const radius = 250 + Math.random() * 122;
    addTree(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      .8 + Math.random() * .75
    );
  }

  // 확장된 외곽 지역에도 숲이 자연스럽게 이어지도록 넓은 고리 형태로 배치합니다.
  for (let i = 0; i < 168; i += 1) {
    const angle = i / 168 * Math.PI * 2 + (Math.random() - .5) * .055;
    const radius = 395 + Math.random() * 260;
    addTree(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      .78 + Math.random() * .82
    );
  }

  for (let i = 0; i < 28; i += 1) {
    const angle = i / 28 * Math.PI * 2;
    const radius = 96 + Math.random() * 30;
    const rockX = Math.cos(angle) * radius;
    const rockZ = Math.sin(angle) * radius;
    if (isDriveLane(rockX, rockZ, 2.5) || overlapsHill(rockX, rockZ, 2.5) || overlapsWater(rockX, rockZ, 2.5)) continue;
    const rockRadius = .7 + Math.random() * 1.5;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockRadius, 0), MAT.rock);
    rock.position.set(rockX, .65, rockZ);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = .55 + Math.random() * .5;
    rock.castShadow = true;
    world.add(rock);
    colliders.push({ minX: rock.position.x - rockRadius, maxX: rock.position.x + rockRadius, minZ: rock.position.z - rockRadius, maxZ: rock.position.z + rockRadius, maxY: rockRadius * 1.5 });
  }

  for (let i = 0; i < 38; i += 1) {
    const angle = i / 38 * Math.PI * 2;
    const radius = 155 + Math.random() * 68;
    const rockX = Math.cos(angle) * radius;
    const rockZ = Math.sin(angle) * radius;
    if (isDriveLane(rockX, rockZ, 2.5) || overlapsHill(rockX, rockZ, 2.5) || overlapsWater(rockX, rockZ, 2.5)) continue;
    const rockRadius = .6 + Math.random() * 1.35;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockRadius, 0), MAT.rock);
    rock.position.set(rockX, .58, rockZ);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = .5 + Math.random() * .55;
    rock.castShadow = true;
    world.add(rock);
    colliders.push({ minX: rock.position.x - rockRadius, maxX: rock.position.x + rockRadius, minZ: rock.position.z - rockRadius, maxZ: rock.position.z + rockRadius, maxY: rockRadius * 1.5 });
  }

  for (let i = 0; i < 64; i += 1) {
    const angle = i / 64 * Math.PI * 2 + Math.random() * .06;
    const radius = 245 + Math.random() * 125;
    const rockX = Math.cos(angle) * radius;
    const rockZ = Math.sin(angle) * radius;
    if (isDriveLane(rockX, rockZ, 2.5) || overlapsHill(rockX, rockZ, 2.5) || overlapsWater(rockX, rockZ, 2.5)) continue;
    const rockRadius = .55 + Math.random() * 1.45;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockRadius, 0), MAT.rock);
    rock.position.set(rockX, .55, rockZ);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = .48 + Math.random() * .58;
    rock.castShadow = true;
    world.add(rock);
    colliders.push({ minX: rock.position.x - rockRadius, maxX: rock.position.x + rockRadius, minZ: rock.position.z - rockRadius, maxZ: rock.position.z + rockRadius, maxY: rockRadius * 1.5 });
  }

  for (let i = 0; i < 112; i += 1) {
    const angle = i / 112 * Math.PI * 2 + Math.random() * .045;
    const radius = 400 + Math.random() * 255;
    const rockX = Math.cos(angle) * radius;
    const rockZ = Math.sin(angle) * radius;
    if (isDriveLane(rockX, rockZ, 3) || overlapsHill(rockX, rockZ, 3) || overlapsWater(rockX, rockZ, 3)) continue;
    const rockRadius = .55 + Math.random() * 1.65;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockRadius, 0), MAT.rock);
    rock.position.set(rockX, .55, rockZ);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = .48 + Math.random() * .6;
    rock.castShadow = true;
    world.add(rock);
    colliders.push({
      minX: rockX - rockRadius,
      maxX: rockX + rockRadius,
      minZ: rockZ - rockRadius,
      maxZ: rockZ + rockRadius,
      maxY: rockRadius * 1.6
    });
  }

  // 맵 경계 밖 배경 산
  for (let i = 0; i < 38; i += 1) {
    const angle = i / 38 * Math.PI * 2;
    const radius = WORLD_HALF_SIZE + 62 + Math.random() * 34;
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(22 + Math.random() * 18, 42 + Math.random() * 35, 5), i % 3 ? MAT.rock : MAT.concreteDark);
    mountain.position.set(Math.cos(angle) * radius, 12, Math.sin(angle) * radius);
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
  addCloud(-165, 48, 105, 1.25);
  addCloud(180, 42, -120, 1.35);
  addCloud(-310, 52, -175, 1.5);
  addCloud(285, 45, 230, 1.4);
  addCloud(-560, 55, -360, 1.65);
  addCloud(540, 48, -410, 1.55);
  addCloud(480, 58, 510, 1.7);
  addCloud(-440, 44, 520, 1.45);

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

  // 맵 곳곳의 무료 크레딧 코인. 획득한 코인은 잠시 후 같은 위치에 다시 나타납니다.
  const coinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc928,
    emissive: 0x8c4c00,
    emissiveIntensity: .55,
    roughness: .48,
    metalness: .28,
    flatShading: true
  });
  const moneyPickups = [];
  const MONEY_PICKUP_POSITIONS = [
    [0,-3],[11,18],[-18,34],[-48,-42],[54,58],[-37,91],
    [116,5],[68,36],[20,5],[68,-26],[101,25],[36,-15],
    [-116,-82],[-168,22],[-124,142],[-22,190],[112,166],[184,65],
    [168,-118],[48,-182],[-88,-174],[144,112],[-182,-126],[8,152],
    [-286,42],[-330,-65],[-292,188],[-165,305],[5,342],[178,308],
    [315,175],[342,-18],[298,-204],[164,-328],[-20,-346],[-194,-304],
    [-322,-190],[68,-292],[236,252],[-248,264]
  ];

  MONEY_PICKUP_POSITIONS.forEach(([x, z]) => {
    const group = new THREE.Group();
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(.58, .58, .18, 10), coinMaterial);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = false;
    group.add(coin);
    group.position.set(x, 1.45, z);
    world.add(group);
    moneyPickups.push({ group, baseY: 1.45, active: true, respawnAt: 0 });
  });

  function updateMoneyPickups(dt) {
    const now = performance.now();
    moneyPickups.forEach((pickup, index) => {
      if (!pickup.active) {
        if (now >= pickup.respawnAt) {
          pickup.active = true;
          pickup.group.visible = true;
        }
        return;
      }
      pickup.group.rotation.y += dt * 2.2;
      pickup.group.position.y = pickup.baseY + Math.sin(now * .003 + index) * .18;
      const dx = state.position.x - pickup.group.position.x;
      const dz = state.position.z - pickup.group.position.z;
      if (dx * dx + dz * dz < 5.2 && Math.abs(state.position.y - pickup.group.position.y) < 3) {
        pickup.active = false;
        pickup.group.visible = false;
        pickup.respawnAt = now + 25000;
        addCredits(50, "맵 코인 획득");
      }
    });
  }

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
    const isBike = definition.type === "bike";
    const visual = getVehicleVisualSpec(definition);
    root.add(body);
    const paint = flatMaterial(paintHex, .55, .08);
    const paintDark = flatMaterial(new THREE.Color(paintHex).multiplyScalar(.68), .65, .06);
    const accent = flatMaterial(visual.accent, .5, .1);
    const wheels = [];
    const frontPivots = [];

    function wheel(x, y, z, radius, front, width = .42) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      body.add(pivot);
      // 조향 피벗과 회전축을 분리해 바퀴가 기울어지지 않고 X축으로 정확히 굴러갑니다.
      const spinGroup = new THREE.Group();
      pivot.add(spinGroup);
      const tire = makeMesh(new THREE.CylinderGeometry(radius, radius, width, 12), MAT.tire, 0, 0, 0, spinGroup);
      tire.rotation.z = Math.PI / 2;
      const rim = makeMesh(new THREE.CylinderGeometry(radius * .48, radius * .48, width + .03, 8), MAT.rim, 0, 0, 0, spinGroup);
      rim.rotation.z = Math.PI / 2;
      wheels.push(spinGroup);
      if (front) frontPivots.push(pivot);
    }

    if (definition.type === "bike") {
      const bikeLength = visual.lengthScale;
      const bikeWheel = .72 * visual.wheelScale;
      wheel(0, bikeWheel + .04, 1.62 * bikeLength, bikeWheel, true, .28 + visual.widthScale * .04);
      wheel(0, bikeWheel + .04, -1.48 * bikeLength, bikeWheel, false, .28 + visual.widthScale * .04);
      const frame = makeMesh(new THREE.BoxGeometry(.3 + visual.widthScale * .05, .34, 2.25 * bikeLength), paint, 0, 1.08, .05, body);
      frame.rotation.x = -.08;
      makeMesh(new THREE.BoxGeometry(.48 + visual.widthScale * .1, .36 + visual.heightScale * .06, .86 + visual.lengthScale * .2), paint, 0, 1.35, -.35, body);
      const tank = makeMesh(new THREE.SphereGeometry(.48 + visual.heightScale * .04, 8, 6), paint, 0, 1.58, .38 + visual.cabinShift * .25, body);
      tank.scale.set(.68 + visual.widthScale * .1, .62 + visual.heightScale * .1, 1.02 + visual.lengthScale * .18);
      makeMesh(new THREE.BoxGeometry(.42 + visual.widthScale * .06, .16 + visual.heightScale * .03, .65 + visual.lengthScale * .12), MAT.dark, 0, 1.58, -.75, body);
      const fork = makeMesh(new THREE.BoxGeometry(.12, 1.15, .12), MAT.rim, 0, 1.25, 1.35, body);
      fork.rotation.x = -.22;
      makeMesh(new THREE.BoxGeometry(1.12, .1, .12), MAT.dark, 0, 1.85, 1.28, body);
      makeMesh(new THREE.BoxGeometry(.18, .7, .15), MAT.dark, 0, 2.02, -.25, body);
      makeMesh(new THREE.SphereGeometry(.26, 8, 6), MAT.dark, 0, 2.43, -.22, body);
      makeMesh(new THREE.BoxGeometry(.42, .18, .22), MAT.white, 0, 1.75, 1.72, body);
      if (visual.feature % 2 === 0) {
        const fairing = makeMesh(new THREE.BoxGeometry(.72, .62, .18), accent, 0, 1.52, .96, body);
        fairing.rotation.x = -.2;
      }
      if (visual.feature % 3 === 0) makeMesh(new THREE.BoxGeometry(.5, .1, .9), accent, 0, 1.08, -1.02, body);
      if (visual.feature >= 3) {
        const exhaust = makeMesh(new THREE.CylinderGeometry(.09, .13, 1.05, 7), MAT.rim, -.31, 1.03, -.68, body);
        exhaust.rotation.x = Math.PI / 2;
      }
    } else {
      const isBuggy = definition.type === "buggy";
      const isSuper = definition.type === "super";
      const isRoadster = definition.type === "roadster";
      const isTruck = definition.type === "truck";
      const isVan = definition.type === "van";
      const isKart = definition.type === "kart";
      const isATV = definition.type === "atv";
      const baseWidth = isTruck ? 3.45 : isVan ? 3.25 : isKart ? 2.3 : isATV ? 2.55 : isBuggy ? 2.9 : isSuper ? 3.15 : 3.05;
      const baseLength = isTruck ? 6.7 : isVan ? 6.25 : isKart ? 3.55 : isATV ? 3.8 : isSuper ? 5.8 : 5.25;
      const baseWheelRadius = isTruck ? .76 : isVan ? .64 : isKart ? .4 : isATV ? .68 : isBuggy ? .72 : isSuper ? .55 : .61;
      const width = baseWidth * visual.widthScale;
      const length = baseLength * visual.lengthScale;
      const wheelRadius = baseWheelRadius * visual.wheelScale;
      const cabinY = (isTruck ? 1.86 : isVan ? 1.78 : isKart ? 1.12 : isATV ? 1.38 : isSuper ? 1.48 : 1.65) * visual.heightScale;
      const bodyHeight = isKart ? .34 : isATV ? .48 : isTruck ? .78 : .68;
      const bodyY = wheelRadius + .39;

      makeMesh(new THREE.BoxGeometry(width, bodyHeight, length), paint, 0, bodyY, 0, body);
      makeMesh(new THREE.BoxGeometry(width * .88, .25, Math.min(1.15, length * .22)), paintDark, 0, bodyY + .06, -length * .42, body);
      if (isTruck) {
        makeMesh(new THREE.BoxGeometry(width * .82, 1.35 * visual.heightScale, length * .28), paint, 0, cabinY, length * .25, body);
        makeMesh(new THREE.BoxGeometry(width * .9, 1.45 * visual.heightScale, length * .48), accent, 0, cabinY + .05, -length * .2, body);
        const windshield = makeMesh(new THREE.BoxGeometry(width * .7, .72 * visual.heightScale, .12), MAT.glass, 0, cabinY + .05, length * .4, body);
        windshield.rotation.x = -.08;
      } else if (isVan) {
        makeMesh(new THREE.BoxGeometry(width * .82, 1.55 * visual.heightScale, length * .72), paint, 0, cabinY, -.2, body);
        const windshield = makeMesh(new THREE.BoxGeometry(width * .7, .78 * visual.heightScale, .12), MAT.glass, 0, cabinY + .08, length * .29, body);
        windshield.rotation.x = -.12;
        makeMesh(new THREE.BoxGeometry(width * .08, .72, length * .34), accent, width * .42, cabinY, -.4, body);
      } else if (isKart) {
        makeMesh(new THREE.BoxGeometry(width * .5, .58, length * .28), MAT.dark, 0, cabinY, -.25, body);
        makeMesh(new THREE.BoxGeometry(width * .5, .48, length * .2), accent, 0, bodyY + .25, -length * .34, body);
        const steering = makeMesh(new THREE.CylinderGeometry(.05, .05, .72, 6), MAT.dark, 0, 1.18, length * .13, body);
        steering.rotation.x = -.35;
      } else if (isATV) {
        makeMesh(new THREE.BoxGeometry(width * .48, .55, length * .38), paint, 0, cabinY, .18, body);
        makeMesh(new THREE.BoxGeometry(width * .48, .18, length * .32), MAT.dark, 0, cabinY + .3, -length * .2, body);
        makeMesh(new THREE.BoxGeometry(width * .78, .1, .12), MAT.dark, 0, cabinY + .7, length * .2, body);
      } else if (isBuggy) {
        const cabin = makeMesh(new THREE.BoxGeometry(width * .73, 1.05 * visual.heightScale, length * .4), MAT.dark, 0, 1.7, visual.cabinShift, body);
        cabin.material = new THREE.MeshStandardMaterial({ color: 0x1d2b30, roughness: .6, wireframe: true });
        makeMesh(new THREE.BoxGeometry(width * .78, .22, .6), accent, 0, 1.38, length * .28, body);
      } else {
        const cabinLength = (isRoadster ? 1.75 : 2.35) * (.9 + visual.lengthScale * .1);
        makeMesh(new THREE.BoxGeometry(width * .78, (isSuper ? .66 : .92) * visual.heightScale, cabinLength), paint, 0, cabinY, -.25 + visual.cabinShift, body);
        const windshield = makeMesh(new THREE.BoxGeometry(width * .7, (isSuper ? .52 : .69) * visual.heightScale, .12), MAT.glass, 0, cabinY + .04, .85 + visual.cabinShift, body);
        windshield.rotation.x = -.2;
        if (!isRoadster) {
          const rear = makeMesh(new THREE.BoxGeometry(width * .7, (isSuper ? .48 : .64) * visual.heightScale, .12), MAT.glass, 0, cabinY + .02, -1.15 + visual.cabinShift, body);
          rear.rotation.x = .17;
        } else {
          makeMesh(new THREE.BoxGeometry(width * .72, .14, 1.1), MAT.dark, 0, cabinY + .43, -.45 + visual.cabinShift, body);
        }
      }
      const lampX = width * .29;
      makeMesh(new THREE.BoxGeometry(width * .22, .25, .08), MAT.white, -lampX, bodyY + .12, length / 2 + .04, body);
      makeMesh(new THREE.BoxGeometry(width * .22, .25, .08), MAT.white, lampX, bodyY + .12, length / 2 + .04, body);
      makeMesh(new THREE.BoxGeometry(width * .19, .22, .08), MAT.red, -lampX, bodyY + .12, -length / 2 - .04, body);
      makeMesh(new THREE.BoxGeometry(width * .19, .22, .08), MAT.red, lampX, bodyY + .12, -length / 2 - .04, body);
      const axleZ = length * .315;
      wheel(-width / 2 - .08, wheelRadius + .07, axleZ, wheelRadius, true);
      wheel(width / 2 + .08, wheelRadius + .07, axleZ, wheelRadius, true);
      wheel(-width / 2 - .08, wheelRadius + .07, -axleZ, wheelRadius, false);
      wheel(width / 2 + .08, wheelRadius + .07, -axleZ, wheelRadius, false);

      // 스트라이프와 포인트 파츠 조합으로 모든 모델의 실루엣을 구분합니다.
      makeMesh(new THREE.BoxGeometry(width * (.1 + (visual.variant % 3) * .035), .05, length * .72), accent, 0, bodyY + bodyHeight / 2 + .035, 0, body);
      if (visual.feature === 0 || visual.feature === 4) {
        makeMesh(new THREE.BoxGeometry(width * .28, .18, length * .15), MAT.dark, 0, 1.45, length * .26, body);
      }
      if ((visual.feature === 1 || visual.feature === 5) && !isKart && !isATV) {
        makeMesh(new THREE.BoxGeometry(width * .58, .2, length * .2), accent, 0, cabinY + .58, -.15 + visual.cabinShift, body);
      }
      if (visual.feature === 2) {
        makeMesh(new THREE.BoxGeometry(width * .92, .2, .22), MAT.dark, 0, .95, length / 2 + .14, body);
      }
    }

    // 선택된 무료 장신구를 실제 3D 모델에 추가합니다.
    if (equipped.has("spoiler") && !isBike) {
      makeMesh(new THREE.BoxGeometry(3.35, .14, .55), MAT.dark, 0, 2.05, -2.25, body);
      makeMesh(new THREE.BoxGeometry(.13, .58, .13), MAT.dark, -1.1, 1.8, -2.2, body);
      makeMesh(new THREE.BoxGeometry(.13, .58, .13), MAT.dark, 1.1, 1.8, -2.2, body);
    }
    if (equipped.has("lights")) {
      const lightPositions = isBike ? [-.24, 0, .24] : [-.6, -.2, .2, .6];
      lightPositions.forEach(x => {
        makeMesh(
          new THREE.SphereGeometry(isBike ? .1 : .12, 7, 5),
          MAT.white,
          x,
          isBike ? 1.72 : 2.35,
          isBike ? 1.57 : .1,
          body
        );
      });
    }
    if (equipped.has("antenna")) {
      makeMesh(
        new THREE.CylinderGeometry(.025, .025, isBike ? 1.1 : 1.5, 5),
        MAT.dark,
        isBike ? .24 : .65,
        isBike ? 2.18 : 2.8,
        isBike ? -.92 : -.55,
        body
      );
    }
    if (equipped.has("flag")) {
      const flagX = isBike ? -.24 : -.75;
      const flagZ = isBike ? -1.18 : -1.25;
      makeMesh(
        new THREE.CylinderGeometry(.025, .025, isBike ? 1.45 : 2.2, 5),
        MAT.dark,
        flagX,
        isBike ? 2.15 : 2.5,
        flagZ,
        body
      );
      const flag = makeMesh(
        new THREE.PlaneGeometry(isBike ? .65 : .8, isBike ? .4 : .5),
        MAT.orange,
        flagX + (isBike ? .29 : .37),
        isBike ? 2.68 : 3.35,
        flagZ,
        body
      );
      flag.rotation.y = Math.PI / 2;
    }

    // 부스터 사용 시 차량 뒤에서 보이는 저폴리곤 제트 불꽃입니다.
    const boostJets = [];
    const jetZ = definition.type === "truck" ? -3.85
      : definition.type === "van" ? -3.55
        : definition.type === "kart" || definition.type === "atv" ? -2.15
          : -3.25;
    const jetPositions = isBike ? [[0, 1.02, -1.95]] : [[-.72, .95, jetZ], [.72, .95, jetZ]];
    jetPositions.forEach(([x, y, z]) => {
      const jet = new THREE.Mesh(
        new THREE.ConeGeometry(isBike ? .18 : .23, isBike ? 1.05 : 1.25, 7),
        new THREE.MeshBasicMaterial({ color: 0x55e8ff, transparent: true, opacity: .9 })
      );
      jet.position.set(x, y, z);
      jet.rotation.x = -Math.PI / 2;
      jet.visible = false;
      body.add(jet);
      boostJets.push(jet);
    });
    return { root, body, wheels, frontPivots, boostJets };
  }

  const ownedVehicleIds = new Set(VEHICLES.filter(vehicleData => !vehicleData.generated).map(vehicleData => vehicleData.id));
  if (Array.isArray(savedGame.ownedVehicles)) {
    savedGame.ownedVehicles
      .filter(id => VEHICLES.some(vehicleData => vehicleData.id === id))
      .forEach(id => ownedVehicleIds.add(id));
  }
  const savedVehicleIndex = Number(savedGame.selectedVehicle);
  let selectedIndex = Number.isInteger(savedVehicleIndex) && VEHICLES[savedVehicleIndex] &&
    ownedVehicleIds.has(VEHICLES[savedVehicleIndex].id) ? savedVehicleIndex : 0;
  let previewIndex = selectedIndex;
  let selectedPaint = VEHICLES[selectedIndex].color;
  const equipped = new Set();

  // 컬러와 장신구는 새로고침 후에도 유지합니다. 손상된 저장값은 안전하게 무시합니다.
  try {
    const savedPaintValue = savedGame.paint ?? localStorage.getItem("neon-trails-paint");
    const savedPaint = Number(savedPaintValue);
    if (savedPaintValue !== null && Number.isInteger(savedPaint) && savedPaint >= 0 && savedPaint <= 0xffffff) {
      selectedPaint = savedPaint;
    }

    const savedAccessories = Array.isArray(savedGame.accessories)
      ? savedGame.accessories
      : JSON.parse(localStorage.getItem("neon-trails-accessories") || "[]");
    const knownAccessoryIds = new Set(ACCESSORIES.map(item => item.id));
    if (Array.isArray(savedAccessories)) {
      savedAccessories.filter(id => knownAccessoryIds.has(id)).forEach(id => equipped.add(id));
    }
  } catch (error) {
    console.warn("저장된 장신구 설정을 불러오지 못했습니다.", error);
  }

  function saveCustomization() {
    try {
      localStorage.setItem("neon-trails-paint", String(selectedPaint));
      localStorage.setItem("neon-trails-accessories", JSON.stringify([...equipped]));
      saveGame(false);
    } catch (error) {
      console.warn("장신구 설정을 저장하지 못했습니다.", error);
    }
  }

  function isAccessoryCompatible(item, definition = VEHICLES[selectedIndex]) {
    return !(item.excludeTypes || []).includes(definition.type);
  }
  let vehicleVisual = null;
  const vehicle = new THREE.Group();
  scene.add(vehicle);

  function rebuildPlayerVehicle() {
    if (vehicleVisual) vehicle.remove(vehicleVisual.root);
    vehicleVisual = buildVehicleModel(VEHICLES[selectedIndex], selectedPaint, equipped);
    vehicle.add(vehicleVisual.root);
  }
  rebuildPlayerVehicle();

  // ────────────────────────────────────────────────────────────────────────
  // AI 차량: 정해진 경로 없이 맵 전체를 무작위로 배회합니다.
  // ────────────────────────────────────────────────────────────────────────
  const aiVehicles = [];

  function chooseRandomAITarget(ai) {
    const safeEdge = WORLD_HALF_SIZE - 28;
    let targetX = 0;
    let targetZ = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      targetX = THREE.MathUtils.randFloat(-safeEdge, safeEdge);
      targetZ = THREE.MathUtils.randFloat(-safeEdge, safeEdge);
      if (Math.hypot(targetX - ai.pathPosition.x, targetZ - ai.pathPosition.z) > 45) break;
    }
    ai.wanderTarget.set(targetX, 0, targetZ);
    ai.decisionTimer = THREE.MathUtils.randFloat(3.5, 8.5);
    ai.wanderTurnRate = THREE.MathUtils.randFloat(.65, 1.35);
  }

  function addAIVehicle(definitionIndex, color, options) {
    const model = buildVehicleModel(VEHICLES[definitionIndex], color, new Set());
    const root = new THREE.Group();
    root.add(model.root);
    // AI가 많아져도 그림자 비용이 급증하지 않도록 수신 그림자만 유지합니다.
    model.root.traverse(node => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = true;
      }
    });
    scene.add(root);
    const ai = {
      root,
      model,
      definition: VEHICLES[definitionIndex],
      speed: options.speed,
      spin: 0,
      heading: Math.random() * Math.PI * 2,
      pathPosition: new THREE.Vector3(),
      wanderTarget: new THREE.Vector3(),
      decisionTimer: 0,
      wanderPhase: Math.random() * Math.PI * 2,
      wanderTurnRate: 1,
      knockbackOffset: new THREE.Vector2(),
      knockbackVelocity: new THREE.Vector2(),
      collisionCooldown: 0,
      speedScale: 1,
      tiltImpulse: 0
    };
    ai.root.position.set(options.x, 0, options.z);
    ai.pathPosition.copy(ai.root.position);
    chooseRandomAITarget(ai);
    aiVehicles.push(ai);
    return ai;
  }

  // 서로 떨어진 위치에서 출발한 뒤 각자 마음대로 방향을 바꿉니다.
  addAIVehicle(1, 0x2f70ff, { speed: 19, x: 96, z: 8 });
  addAIVehicle(3, 0x55dca5, { speed: 16, x: 42, z: 48 });
  addAIVehicle(0, 0xff5a36, { speed: 17.5, x: 38, z: -46 });
  addAIVehicle(2, 0xf6bd31, { speed: 14, x: -235, z: -155 });
  addAIVehicle(0, 0xf2f4f6, { speed: 15.5, x: 220, z: 185 });
  addAIVehicle(4, 0xb84fff, { speed: 17, x: -165, z: 238 });

  function aiCollisionRadius(ai) {
    return ai.definition.type === "bike" ? .9 : 1.45;
  }

  // 충돌체 안으로 한 프레임 깊게 들어가도 가장 가까운 바깥 지점까지 즉시 분리합니다.
  // 이전 방식처럼 작은 반동만 반복하면 W를 누른 채 나무에 닿았을 때 차가 끼어 떨릴 수 있습니다.
  function getBoxContact(box, position, radius) {
    const closestX = THREE.MathUtils.clamp(position.x, box.minX, box.maxX);
    const closestZ = THREE.MathUtils.clamp(position.z, box.minZ, box.maxZ);
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distance = Math.hypot(dx, dz);
    if (distance >= radius) return null;

    if (distance > .0001) {
      const normalX = dx / distance;
      const normalZ = dz / distance;
      const push = radius - distance + .04;
      return {
        normalX,
        normalZ,
        x: position.x + normalX * push,
        z: position.z + normalZ * push
      };
    }

    // 차량 중심이 상자 내부에 들어온 경우 확장된 네 면 중 가장 가까운 면으로 꺼냅니다.
    const exits = [
      { distance: position.x - (box.minX - radius), normalX: -1, normalZ: 0, x: box.minX - radius - .04, z: position.z },
      { distance: box.maxX + radius - position.x, normalX: 1, normalZ: 0, x: box.maxX + radius + .04, z: position.z },
      { distance: position.z - (box.minZ - radius), normalX: 0, normalZ: -1, x: position.x, z: box.minZ - radius - .04 },
      { distance: box.maxZ + radius - position.z, normalX: 0, normalZ: 1, x: position.x, z: box.maxZ + radius + .04 }
    ];
    exits.sort((a, b) => a.distance - b.distance);
    return exits[0];
  }

  function applyAIBounce(ai, normalX, normalZ, impactSpeed = ai.speed) {
    let length = Math.hypot(normalX, normalZ);
    if (length < .001) {
      normalX = -Math.sin(ai.heading);
      normalZ = -Math.cos(ai.heading);
      length = 1;
    }
    normalX /= length;
    normalZ /= length;
    const impulse = THREE.MathUtils.clamp(3.8 + impactSpeed * .38, 4, 14);
    ai.knockbackVelocity.x += normalX * impulse;
    ai.knockbackVelocity.y += normalZ * impulse;
    ai.knockbackOffset.x += normalX * .35;
    ai.knockbackOffset.y += normalZ * .35;
    ai.speedScale = Math.min(ai.speedScale, .42);
    ai.collisionCooldown = .18;
    ai.decisionTimer = Math.min(ai.decisionTimer, .8);
    const side = Math.cos(ai.heading) * normalX - Math.sin(ai.heading) * normalZ;
    ai.tiltImpulse = THREE.MathUtils.clamp(side * .18, -.18, .18);
    ai.root.position.x = ai.pathPosition.x + ai.knockbackOffset.x;
    ai.root.position.z = ai.pathPosition.z + ai.knockbackOffset.y;
  }

  function resolveAICollisions() {
    aiVehicles.forEach(ai => {
      const radius = aiCollisionRadius(ai);
      for (const box of colliders) {
        const contact = getBoxContact(box, ai.root.position, radius);
        if (contact && ai.root.position.y < (box.maxY ?? 3.2) + .55) {
          if (ai.collisionCooldown <= 0) applyAIBounce(ai, contact.normalX, contact.normalZ, ai.speed);
          ai.root.position.x = contact.x;
          ai.root.position.z = contact.z;
          ai.knockbackOffset.set(
            ai.root.position.x - ai.pathPosition.x,
            ai.root.position.z - ai.pathPosition.z
          );
          break;
        }
      }
    });

    for (let i = 0; i < aiVehicles.length; i += 1) {
      for (let j = i + 1; j < aiVehicles.length; j += 1) {
        const a = aiVehicles[i];
        const b = aiVehicles[j];
        const dx = a.root.position.x - b.root.position.x;
        const dz = a.root.position.z - b.root.position.z;
        const distance = Math.hypot(dx, dz);
        const contactDistance = aiCollisionRadius(a) + aiCollisionRadius(b);
        if (distance >= contactDistance || Math.abs(a.root.position.y - b.root.position.y) >= 2.2) continue;

        const normalX = distance > .001 ? dx / distance : Math.sin(a.heading);
        const normalZ = distance > .001 ? dz / distance : Math.cos(a.heading);
        const overlap = contactDistance - distance + .08;
        a.knockbackOffset.x += normalX * overlap * .5;
        a.knockbackOffset.y += normalZ * overlap * .5;
        b.knockbackOffset.x -= normalX * overlap * .5;
        b.knockbackOffset.y -= normalZ * overlap * .5;
        if (a.collisionCooldown <= 0) applyAIBounce(a, normalX, normalZ, b.speed);
        if (b.collisionCooldown <= 0) applyAIBounce(b, -normalX, -normalZ, a.speed);
      }
    }
  }

  function updateAIVehicles(dt) {
    aiVehicles.forEach(ai => {
      let steering = 0;
      ai.collisionCooldown = Math.max(0, ai.collisionCooldown - dt);
      ai.speedScale = THREE.MathUtils.lerp(ai.speedScale, 1, 1 - Math.exp(-2.5 * dt));
      const waterSpeedScale = isPositionInWater(ai.pathPosition) ? .38 : 1;
      const actualSpeed = ai.speed * ai.speedScale * waterSpeedScale;
      ai.decisionTimer -= dt;
      ai.wanderPhase += dt * ai.wanderTurnRate;
      const distanceToEdge = WORLD_HALF_SIZE - Math.max(Math.abs(ai.pathPosition.x), Math.abs(ai.pathPosition.z));
      const dx = ai.wanderTarget.x - ai.pathPosition.x;
      const dz = ai.wanderTarget.z - ai.pathPosition.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 10 || ai.decisionTimer <= 0 || distanceToEdge < 18) chooseRandomAITarget(ai);

      const targetDx = ai.wanderTarget.x - ai.pathPosition.x;
      const targetDz = ai.wanderTarget.z - ai.pathPosition.z;
      const randomWobble = Math.sin(ai.wanderPhase) * .28;
      const desiredHeading = Math.atan2(targetDx, targetDz) + randomWobble;
      const headingDelta = Math.atan2(Math.sin(desiredHeading - ai.heading), Math.cos(desiredHeading - ai.heading));
      ai.heading += headingDelta * (1 - Math.exp(-2.1 * dt));
      const wanderingSpeed = actualSpeed * (.72 + (Math.sin(ai.wanderPhase * .63) + 1) * .14);
      ai.pathPosition.x += Math.sin(ai.heading) * wanderingSpeed * dt;
      ai.pathPosition.z += Math.cos(ai.heading) * wanderingSpeed * dt;
      steering = THREE.MathUtils.clamp(headingDelta, -.42, .42);

      ai.knockbackOffset.addScaledVector(ai.knockbackVelocity, dt);
      ai.knockbackVelocity.multiplyScalar(Math.exp(-4.2 * dt));
      ai.knockbackOffset.multiplyScalar(Math.exp(-1.8 * dt));
      ai.root.position.x = ai.pathPosition.x + ai.knockbackOffset.x;
      ai.root.position.z = ai.pathPosition.z + ai.knockbackOffset.y;
      const surface = getSurfaceInfo(ai.root.position);
      ai.root.position.y = surface.height;
      ai.root.rotation.y = ai.heading;
      ai.model.body.rotation.x = surfacePitchForHeading(surface, ai.heading);
      ai.tiltImpulse *= Math.exp(-7 * dt);
      ai.model.body.rotation.z = -steering * .12 + ai.tiltImpulse;
      ai.spin += actualSpeed * dt / .62;
      ai.model.wheels.forEach(wheel => { wheel.rotation.x = ai.spin; });
      ai.model.frontPivots.forEach(pivot => { pivot.rotation.y = steering; });
    });
    resolveAICollisions();
  }
  updateAIVehicles(0);

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
  // 바퀴 자국: 작은 로우폴리 평면을 풀링해 자동차는 두 줄, 바이크는 한 줄로 남깁니다.
  // ────────────────────────────────────────────────────────────────────────
  const TIRE_TRACK_COUNT = 120;
  const TIRE_TRACK_LIFETIME = 24;
  const tireTracks = [];
  let tireTrackCursor = 0;
  let previousTrackPoints = null;

  for (let index = 0; index < TIRE_TRACK_COUNT; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: 0x17201d,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, .018, 1), material);
    mesh.visible = false;
    mesh.renderOrder = 2;
    scene.add(mesh);
    tireTracks.push({ mesh, age: TIRE_TRACK_LIFETIME, strength: 0 });
  }

  function placeTireTrack(start, end, width, strength, surfaceY) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    if (length < .04 || length > 3.2) return;
    const track = tireTracks[tireTrackCursor];
    tireTrackCursor = (tireTrackCursor + 1) % tireTracks.length;
    track.age = 0;
    track.strength = strength;
    track.mesh.visible = true;
    track.mesh.position.set((start.x + end.x) / 2, surfaceY + .035, (start.z + end.z) / 2);
    track.mesh.rotation.set(0, Math.atan2(dx, dz), 0);
    track.mesh.scale.set(width, 1, length + .08);
    track.mesh.material.opacity = strength;
  }

  function updateTireTracks(dt) {
    tireTracks.forEach(track => {
      if (!track.mesh.visible) return;
      track.age += dt;
      const remaining = 1 - track.age / TIRE_TRACK_LIFETIME;
      if (remaining <= 0) {
        track.mesh.visible = false;
        track.mesh.material.opacity = 0;
      } else {
        track.mesh.material.opacity = track.strength * Math.pow(remaining, 1.35);
      }
    });

    if (!state.grounded || state.inWater || Math.abs(state.velocity) < 3) {
      previousTrackPoints = null;
      return;
    }

    const definition = currentVehicle();
    const isBike = definition.type === "bike";
    const forwardX = Math.sin(state.travelHeading);
    const forwardZ = Math.cos(state.travelHeading);
    const sideX = Math.cos(state.heading);
    const sideZ = -Math.sin(state.heading);
    const rearDistance = isBike ? 1.48 : 1.62;
    const wheelOffset = isBike ? 0 : 1.18;
    const rearX = state.position.x - forwardX * rearDistance;
    const rearZ = state.position.z - forwardZ * rearDistance;
    const currentPoints = isBike
      ? [new THREE.Vector3(rearX, 0, rearZ)]
      : [
          new THREE.Vector3(rearX - sideX * wheelOffset, 0, rearZ - sideZ * wheelOffset),
          new THREE.Vector3(rearX + sideX * wheelOffset, 0, rearZ + sideZ * wheelOffset)
        ];

    if (!previousTrackPoints || previousTrackPoints.length !== currentPoints.length) {
      previousTrackPoints = currentPoints;
      return;
    }
    const movement = currentPoints[0].distanceTo(previousTrackPoints[0]);
    if (movement > 3) {
      previousTrackPoints = currentPoints;
      return;
    }
    if (movement < .38) return;

    const strength = THREE.MathUtils.lerp(.24, .68, state.drift);
    const width = isBike ? .14 : THREE.MathUtils.lerp(.16, .24, state.drift);
    currentPoints.forEach((point, index) => {
      placeTireTrack(previousTrackPoints[index], point, width, strength, state.position.y);
    });
    previousTrackPoints = currentPoints;
  }

  // 드리프트 연기 역시 고정 크기 풀을 사용해 장시간 플레이해도 오브젝트가 계속 늘지 않습니다.
  const DRIFT_SMOKE_COUNT = 72;
  const smokeGeometry = new THREE.IcosahedronGeometry(.32, 0);
  const driftSmoke = [];
  let smokeCursor = 0;
  let smokeAccumulator = 0;

  for (let index = 0; index < DRIFT_SMOKE_COUNT; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: index % 3 === 0 ? 0x8f9995 : 0xb7bfbc,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(smokeGeometry, material);
    mesh.visible = false;
    mesh.renderOrder = 3;
    scene.add(mesh);
    driftSmoke.push({ mesh, velocity: new THREE.Vector3(), age: 0, lifetime: 1 });
  }

  function emitDriftSmoke() {
    const particle = driftSmoke[smokeCursor];
    smokeCursor = (smokeCursor + 1) % driftSmoke.length;
    const isBike = currentVehicle().type === "bike";
    const forwardX = Math.sin(state.travelHeading);
    const forwardZ = Math.cos(state.travelHeading);
    const sideX = Math.cos(state.heading);
    const sideZ = -Math.sin(state.heading);
    const side = isBike ? 0 : (Math.random() < .5 ? -1 : 1);
    const rearDistance = isBike ? 1.45 : 1.65;
    const wheelOffset = isBike ? 0 : 1.15;
    particle.mesh.position.set(
      state.position.x - forwardX * rearDistance + sideX * wheelOffset * side,
      state.position.y + .32,
      state.position.z - forwardZ * rearDistance + sideZ * wheelOffset * side
    );
    particle.velocity.set(
      -forwardX * (.5 + Math.random() * .8) + sideX * side * (Math.random() - .2),
      .8 + Math.random() * .9,
      -forwardZ * (.5 + Math.random() * .8) + sideZ * side * (Math.random() - .2)
    );
    particle.age = 0;
    particle.lifetime = .75 + Math.random() * .55;
    particle.mesh.scale.setScalar(.55 + Math.random() * .45);
    particle.mesh.material.opacity = .62;
    particle.mesh.visible = true;
  }

  function updateDriftSmoke(dt) {
    driftSmoke.forEach(particle => {
      if (!particle.mesh.visible) return;
      particle.age += dt;
      if (particle.age >= particle.lifetime) {
        particle.mesh.visible = false;
        particle.mesh.material.opacity = 0;
        return;
      }
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.velocity.multiplyScalar(Math.exp(-1.9 * dt));
      particle.velocity.y += .24 * dt;
      const progress = particle.age / particle.lifetime;
      particle.mesh.scale.multiplyScalar(1 + dt * 1.25);
      particle.mesh.material.opacity = .62 * Math.pow(1 - progress, 1.35);
    });

    const emitting = state.grounded && !state.inWater && state.drift > .18 && Math.abs(state.velocity) > 6;
    if (!emitting) {
      smokeAccumulator = 0;
      return;
    }
    smokeAccumulator += dt * (7 + state.drift * 23);
    while (smokeAccumulator >= 1) {
      smokeAccumulator -= 1;
      emitDriftSmoke();
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // 자동차 물리
  // ────────────────────────────────────────────────────────────────────────
  const keys = Object.create(null);
  const savedPosition = savedGame.position || {};
  const savedX = Number(savedPosition.x);
  const savedZ = Number(savedPosition.z);
  const canRestorePosition = Number.isFinite(savedX) && Number.isFinite(savedZ)
    && Math.abs(savedX) < WORLD_HALF_SIZE - 3 && Math.abs(savedZ) < WORLD_HALF_SIZE - 3;
  const savedHeading = Number(savedGame.heading);
  const state = {
    position: new THREE.Vector3(canRestorePosition ? savedX : 0, 0, canRestorePosition ? savedZ : -12),
    velocity: 0,
    verticalVelocity: 0,
    heading: Number.isFinite(savedHeading) ? savedHeading : 0,
    travelHeading: Number.isFinite(savedHeading) ? savedHeading : 0,
    grounded: true,
    pitch: 0,
    roll: 0,
    wheelie: 0,
    wheelSpin: 0,
    steerVisual: 0,
    drift: 0,
    knockback: new THREE.Vector2(),
    collisionCooldown: 0,
    inWater: false,
    boostCharge: 1,
    boosting: false,
    displayedSpeed: 0
  };
  const PHYSICS = {
    reverseAcceleration: 11,
    maxReverse: 13,
    rollingDrag: 2.15,
    airDrag: .015,
    gravity: 24
  };
  let started = false;
  let paused = false;
  let uiOpen = false;
  let distanceForCredits = 0;

  function currentVehicle() { return VEHICLES[selectedIndex]; }
  function clearKeys() { Object.keys(keys).forEach(key => { keys[key] = false; }); }

  function placeVehicle(x, z, heading = 0, message = "") {
    state.position.set(x, 0, z);
    const spawnSurface = getSurfaceInfo(state.position, 0);
    state.position.y = spawnSurface.height;
    state.velocity = 0;
    state.verticalVelocity = 0;
    state.heading = heading;
    state.travelHeading = heading;
    state.grounded = true;
    state.pitch = surfacePitchForHeading(spawnSurface, heading);
    state.roll = 0;
    state.wheelie = 0;
    state.drift = 0;
    state.knockback.set(0, 0);
    state.collisionCooldown = 0;
    state.inWater = isPositionInWater(state.position);
    state.boosting = false;
    state.displayedSpeed = 0;
    vehicleVisual.body.rotation.set(0, 0, 0);
    vehicleVisual.body.position.y = 0;
    if (message) showToast(message);
  }

  function localRampCoordinates(ramp, position) {
    const dx = position.x - ramp.x;
    const dz = position.z - ramp.z;
    const c = Math.cos(ramp.rotationY);
    const s = Math.sin(ramp.rotationY);
    // Three.js의 Y축 회전은 로컬 +Z를 (sin θ, cos θ) 방향으로 보냅니다.
    // 역변환도 같은 규칙을 사용해야 ±90° 점프대의 낮은 입구가 반대로 판정되지 않습니다.
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  }

  function getSurfaceInfo(position, margin = .8) {
    for (const ramp of ramps) {
      const local = localRampCoordinates(ramp, position);
      if (
        Math.abs(local.x) <= ramp.width / 2 + margin &&
        local.z >= -ramp.length / 2 - margin &&
        local.z <= ramp.length / 2 + margin
      ) {
        const progress = THREE.MathUtils.clamp((local.z + ramp.length / 2) / ramp.length, 0, 1);
        return { height: progress * ramp.height, pitch: -Math.atan2(ramp.height, ramp.length), ramp, progress };
      }
    }
    for (const terrain of terrainSurfaces) {
      if (terrain.type === "box") {
        if (
          position.x >= terrain.minX - margin && position.x <= terrain.maxX + margin &&
          position.z >= terrain.minZ - margin && position.z <= terrain.maxZ + margin
        ) return { height: terrain.height, pitch: 0, ramp: null, terrain, progress: 0 };
      } else if (terrain.type === "slope") {
        const local = localRampCoordinates(terrain, position);
        if (
          Math.abs(local.x) <= terrain.width / 2 + margin &&
          local.z >= -terrain.length / 2 - margin &&
          local.z <= terrain.length / 2 + margin
        ) {
          const progress = THREE.MathUtils.clamp((local.z + terrain.length / 2) / terrain.length, 0, 1);
          return {
            height: progress * terrain.height,
            pitch: -Math.atan2(terrain.height, terrain.length),
            ramp: null,
            terrain,
            progress
          };
        }
      } else if (terrain.type === "hill") {
        const dx = position.x - terrain.x;
        const dz = position.z - terrain.z;
        const distance = Math.hypot(dx, dz);
        if (distance <= terrain.radius + margin) {
          const progress = THREE.MathUtils.clamp(1 - distance / terrain.radius, 0, 1);
          const slope = terrain.height / terrain.radius;
          return {
            height: terrain.height * progress,
            pitch: 0,
            gradientX: distance > .01 ? -slope * dx / distance : 0,
            gradientZ: distance > .01 ? -slope * dz / distance : 0,
            ramp: null,
            terrain,
            progress
          };
        }
      }
    }
    const waterBed = getWaterBedInfo(position);
    if (waterBed) return waterBed;
    return { height: 0, pitch: 0, ramp: null, terrain: null, progress: 0 };
  }

  function surfacePitchForHeading(surface, heading) {
    if (Number.isFinite(surface.gradientX) && Number.isFinite(surface.gradientZ)) {
      const forwardSlope =
        surface.gradientX * Math.sin(heading) +
        surface.gradientZ * Math.cos(heading);
      return -Math.atan(forwardSlope);
    }
    const slopeSurface = surface.ramp || (surface.terrain?.type === "slope" ? surface.terrain : null);
    if (slopeSurface) {
      const directionalSlope =
        slopeSurface.height / slopeSurface.length *
        Math.cos(heading - slopeSurface.rotationY);
      return -Math.atan(directionalSlope);
    }
    return surface.pitch;
  }

  function surfaceSlopeForHeading(surface, heading) {
    if (Number.isFinite(surface.gradientX) && Number.isFinite(surface.gradientZ)) {
      return (
        surface.gradientX * Math.sin(heading) +
        surface.gradientZ * Math.cos(heading)
      );
    }
    const slopeSurface = surface.ramp || (surface.terrain?.type === "slope" ? surface.terrain : null);
    if (slopeSurface) {
      return (
        slopeSurface.height / slopeSurface.length *
        Math.cos(heading - slopeSurface.rotationY)
      );
    }
    return 0;
  }

  function getRampForwardSpeed(ramp) {
    // 점프대의 로컬 +Z(낮은 입구 → 높은 끝) 방향으로 이동하는 실제 속도입니다.
    return state.velocity * Math.cos(state.travelHeading - ramp.rotationY);
  }

  function launchFromRamp(ramp, forwardSpeed) {
    const angle = Math.atan2(ramp.height, ramp.length);
    state.verticalVelocity = Math.max(4.8, forwardSpeed * Math.sin(angle) * .72);
    state.grounded = false;
  }

  function launchFromHill(hill, speed) {
    const slope = Math.atan2(hill.height, hill.radius);
    // 산 끝은 점프대보다 완만하므로 속도에 비례한 힘과 최소 이륙 힘을 함께 사용합니다.
    state.verticalVelocity = Math.max(5.8, speed * Math.sin(slope) * .62);
    state.grounded = false;
    state.pitch = -Math.min(slope, .42);
  }

  function applyCollisionBounce(normalX, normalZ, previous, extraImpact = 0) {
    let length = Math.hypot(normalX, normalZ);
    if (length < .001) {
      const travelDirection = state.velocity >= 0 ? 1 : -1;
      normalX = -Math.sin(state.heading) * travelDirection;
      normalZ = -Math.cos(state.heading) * travelDirection;
      length = 1;
    }
    normalX /= length;
    normalZ /= length;

    // 충돌면 바깥쪽으로 즉시 밀어내고, 별도의 수평 반동 속도를 감쇠시키며 적용합니다.
    const impactSpeed = Math.abs(state.velocity);
    const impulse = THREE.MathUtils.clamp(4 + impactSpeed * .48 + extraImpact * .16, 4, 19);
    state.position.x = previous.x + normalX * Math.min(.45 + impactSpeed * .025, 1.2);
    state.position.z = previous.z + normalZ * Math.min(.45 + impactSpeed * .025, 1.2);
    state.knockback.set(normalX * impulse, normalZ * impulse);
    state.velocity *= -.3;
    state.collisionCooldown = .16;

    // 측면 충돌은 차체가 충돌 반대쪽으로 잠깐 기울어져 타격감을 줍니다.
    const forwardX = Math.sin(state.heading);
    const forwardZ = Math.cos(state.heading);
    const sideImpact = forwardZ * normalX - forwardX * normalZ;
    state.roll += THREE.MathUtils.clamp(sideImpact * impactSpeed * .012, -.18, .18);
  }

  function waterCollisionNormal(zone, position) {
    if (zone.type === "ellipse") {
      const nx = (position.x - zone.x) / zone.radiusX;
      const nz = (position.z - zone.z) / zone.radiusZ;
      if (nx * nx + nz * nz >= 1) return null;
      return { x: nx / zone.radiusX, z: nz / zone.radiusZ };
    }
    if (zone.type === "capsule") {
      const segmentX = zone.bx - zone.ax;
      const segmentZ = zone.bz - zone.az;
      const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
      const projection = lengthSquared > .001
        ? ((position.x - zone.ax) * segmentX + (position.z - zone.az) * segmentZ) / lengthSquared
        : 0;
      const t = THREE.MathUtils.clamp(projection, 0, 1);
      const closestX = zone.ax + segmentX * t;
      const closestZ = zone.az + segmentZ * t;
      const dx = position.x - closestX;
      const dz = position.z - closestZ;
      const distance = Math.hypot(dx, dz);
      if (distance >= zone.radius) return null;
      if (distance > .001) return { x: dx / distance, z: dz / distance };
      const length = Math.max(Math.hypot(segmentX, segmentZ), .001);
      return { x: -segmentZ / length, z: segmentX / length };
    }
    if (
      position.x < zone.minX || position.x > zone.maxX ||
      position.z < zone.minZ || position.z > zone.maxZ
    ) return null;
    const edges = [
      { distance: position.x - zone.minX, x: -1, z: 0 },
      { distance: zone.maxX - position.x, x: 1, z: 0 },
      { distance: position.z - zone.minZ, x: 0, z: -1 },
      { distance: zone.maxZ - position.z, x: 0, z: 1 }
    ];
    edges.sort((a, b) => a.distance - b.distance);
    return edges[0];
  }

  // 물은 더 이상 벽이 아닙니다. 영역 판정은 수중 감속과 시각 효과에만 사용합니다.
  function isPositionInWater(position) {
    return waterZones.some(zone => waterCollisionNormal(zone, position));
  }

  function resolveCollisions(previous) {
    const radius = currentVehicle().type === "bike" ? .85 : 1.5;
    for (const box of colliders) {
      const contact = getBoxContact(box, state.position, radius);
      if (contact && state.position.y < (box.maxY ?? 3.2) + .55) {
        if (state.collisionCooldown <= 0) applyCollisionBounce(contact.normalX, contact.normalZ, previous);
        state.position.x = contact.x;
        state.position.z = contact.z;
        return;
      }
    }
    for (const ai of aiVehicles) {
      const aiRadius = ai.definition.type === "bike" ? .9 : 1.45;
      const dx = state.position.x - ai.root.position.x;
      const dz = state.position.z - ai.root.position.z;
      const contactDistance = radius + aiRadius;
      if (
        dx * dx + dz * dz < contactDistance * contactDistance &&
        Math.abs(state.position.y - ai.root.position.y) < 2.2
      ) {
        if (state.collisionCooldown <= 0) {
          applyCollisionBounce(dx, dz, previous, ai.speed);
          if (ai.collisionCooldown <= 0) applyAIBounce(ai, -dx, -dz, Math.abs(state.velocity));
        }
        else {
          state.position.x = previous.x;
          state.position.z = previous.z;
        }
        return;
      }
    }
  }

  function updatePhysics(dt) {
    const spec = currentVehicle();
    const throttle = keys.w ? 1 : 0;
    const reverse = keys.s ? 1 : 0;
    const braking = !!keys.shift;
    const inWaterBeforeMove = isPositionInWater(state.position) && state.position.y < WATER_LEVEL + .3;
    const waterPropulsion = inWaterBeforeMove ? .38 : 1;
    // 요청된 반전 조작: D는 좌회전, A는 우회전으로 매핑합니다.
    const steer = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);
    const surfaceBeforeMove = getSurfaceInfo(state.position);
    const onRampBeforeMove = !!surfaceBeforeMove.ramp;
    const forwardSlope = state.grounded
      ? surfaceSlopeForHeading(surfaceBeforeMove, state.travelHeading)
      : 0;
    const canDrift = state.grounded && !onRampBeforeMove && !inWaterBeforeMove && Math.abs(state.velocity) > 6;
    const driftTarget = keys[" "] && canDrift ? 1 : 0;
    state.drift = THREE.MathUtils.lerp(state.drift, driftTarget, 1 - Math.exp(-(driftTarget ? 8 : 11) * dt));

    if (throttle) state.velocity += (state.velocity < -.5 ? spec.braking * .62 : spec.acceleration) * waterPropulsion * dt;
    if (reverse) state.velocity -= (state.velocity > .5 ? spec.braking * .62 : PHYSICS.reverseAcceleration) * waterPropulsion * dt;

    if (braking && Math.abs(state.velocity) > .03) {
      const before = state.velocity;
      state.velocity -= Math.sign(state.velocity) * spec.braking * dt;
      if (Math.sign(before) !== Math.sign(state.velocity)) state.velocity = 0;
    }

    // 경사 방향의 중력: 오르막은 감속하고 내리막은 자연스럽게 가속합니다.
    if (state.grounded && Math.abs(forwardSlope) > .002) {
      state.velocity -= forwardSlope * PHYSICS.gravity * .82 * dt;
    }

    const boostRequested =
      !!keys.control &&
      state.grounded &&
      !inWaterBeforeMove &&
      !braking &&
      state.velocity >= -.2 &&
      state.boostCharge > .005;
    state.boosting = boostRequested;
    if (state.boosting) {
      state.velocity += (31 + spec.acceleration * .48) * dt;
      state.boostCharge = Math.max(0, state.boostCharge - .29 * dt);
      if (state.boostCharge <= .005) state.boosting = false;
    } else {
      state.boostCharge = Math.min(1, state.boostCharge + .155 * dt);
    }

    // 스로틀을 놓으면 구름저항과 타이어 마찰이 관성에 점진적으로 작용합니다.
    if (!throttle && !reverse) {
      const drag = PHYSICS.rollingDrag + state.velocity * state.velocity * PHYSICS.airDrag;
      state.velocity -= Math.sign(state.velocity) * Math.min(Math.abs(state.velocity), drag * dt);
    }
    if (!state.boosting && state.velocity > spec.maxSpeed && forwardSlope >= -.025) {
      const overspeed = state.velocity - spec.maxSpeed;
      state.velocity -= Math.min(overspeed, (spec.acceleration + 10) * dt);
    }
    state.velocity = THREE.MathUtils.clamp(state.velocity, -PHYSICS.maxReverse, spec.maxSpeed * 1.35);
    if (inWaterBeforeMove) {
      // 물속에서는 강한 저항을 받지만 멈춰 갇히지 않도록 저속 추진력은 유지합니다.
      state.velocity *= Math.exp(-1.35 * dt);
      state.velocity = THREE.MathUtils.clamp(state.velocity, -6.5, 10);
    }
    if (state.drift > .02) {
      const driftDrag = (.9 + Math.abs(state.velocity) * .045) * state.drift;
      state.velocity -= Math.sign(state.velocity) * Math.min(Math.abs(state.velocity), driftDrag * dt);
    }

    const speedRatio = Math.min(Math.abs(state.velocity) / spec.maxSpeed, 1);
    const highSpeedSteering = THREE.MathUtils.lerp(1, .43, speedRatio);
    const airControl = state.grounded ? 1 : .07;
    const moving = THREE.MathUtils.clamp(Math.abs(state.velocity) / 3.8, 0, 1);
    // 앞바퀴가 들린 동안에는 지면 접지력이 줄어 조향이 조금 둔해집니다.
    const wheelieSteering = THREE.MathUtils.lerp(1, .48, THREE.MathUtils.clamp(state.wheelie / .55, 0, 1));
    const driftSteering = THREE.MathUtils.lerp(1, 1.85, state.drift);
    state.heading += steer * spec.handling * highSpeedSteering * airControl * wheelieSteering * driftSteering * moving * (state.velocity >= 0 ? 1 : -1) * dt;

    // 차체는 먼저 꺾이고 실제 이동 방향은 늦게 따라오므로 드리프트 중 옆으로 미끄러집니다.
    const headingDelta = Math.atan2(
      Math.sin(state.heading - state.travelHeading),
      Math.cos(state.heading - state.travelHeading)
    );
    const tireGrip = THREE.MathUtils.lerp(11, 1.65, state.drift);
    state.travelHeading += headingDelta * (1 - Math.exp(-tireGrip * dt));

    const previous = state.position.clone();
    state.position.x += Math.sin(state.travelHeading) * state.velocity * dt;
    state.position.z += Math.cos(state.travelHeading) * state.velocity * dt;
    state.position.x += state.knockback.x * dt;
    state.position.z += state.knockback.y * dt;
    state.knockback.multiplyScalar(Math.exp(-4.8 * dt));
    state.collisionCooldown = Math.max(0, state.collisionCooldown - dt);
    resolveCollisions(previous);
    // 바퀴 속도가 남아 있어도 실제 위치가 움직이지 않으면 HUD가 높은 속도로 고정되지 않게 합니다.
    const planarSpeed = Math.hypot(state.position.x - previous.x, state.position.z - previous.z) / Math.max(dt, .001);
    const displayedTarget = Math.min(Math.abs(state.velocity), planarSpeed);
    state.displayedSpeed = THREE.MathUtils.lerp(
      state.displayedSpeed,
      displayedTarget,
      1 - Math.exp(-(displayedTarget < state.displayedSpeed ? 14 : 8) * dt)
    );
    distanceForCredits += Math.abs(state.velocity) * dt;
    if (distanceForCredits >= 150) {
      distanceForCredits -= 150;
      addCredits(25, "주행 거리 보상");
    }

    const previousSurface = getSurfaceInfo(previous);
    let surface = getSurfaceInfo(state.position);
    state.inWater = isPositionInWater(state.position) && surface.height < WATER_LEVEL;

    // 점프대의 높은 뒤쪽이나 옆면에서 경사 높이가 즉시 적용되는 현상을 막습니다.
    // 지상 차량은 낮은 입구로 들어오거나 이미 같은 경사면 위에 있을 때만 올라갈 수 있습니다.
    if (state.grounded && surface.ramp && previousSurface.ramp !== surface.ramp) {
      const local = localRampCoordinates(surface.ramp, state.position);
      const lowEntranceLimit = -surface.ramp.length / 2 + 2.2;
      const heightStep = surface.height - state.position.y;
      const enteredFromLowSide = local.z <= lowEntranceLimit && heightStep <= 1.1;
      if (!enteredFromLowSide) {
        state.position.x = previous.x;
        state.position.z = previous.z;
        state.velocity *= -.16;
        surface = getSurfaceInfo(state.position);
      }
    }

    // 프레임 사이에 높은 끝을 넘어가도 이륙 속도를 잃지 않도록 이전 경사면에서 점프를 계산합니다.
    if (state.grounded && previousSurface.ramp && !surface.ramp && state.position.y > .5) {
      const forwardSpeed = getRampForwardSpeed(previousSurface.ramp);
      if (previousSurface.progress > .72 && forwardSpeed > 5) {
        launchFromRamp(previousSurface.ramp, forwardSpeed);
      } else {
        state.grounded = false;
        state.verticalVelocity = 0;
      }
    }

    // 산 정상의 꼭대기를 넘어 반대편으로 내려가기 시작하는 순간 점프합니다.
    const previousHill = previousSurface.terrain?.type === "hill" ? previousSurface.terrain : null;
    if (state.grounded && previousHill && Math.abs(state.velocity) > 6) {
      const previousDistance = Math.hypot(previous.x - previousHill.x, previous.z - previousHill.z);
      const currentDistance = Math.hypot(state.position.x - previousHill.x, state.position.z - previousHill.z);
      const movingOutward = currentDistance > previousDistance + .001;
      const sameHill = surface.terrain === previousHill;
      const crossedSummit = sameHill && previousSurface.progress >= .86;
      if (movingOutward && crossedSummit) {
        // 정상 높이를 유지한 채 이륙해 꼭대기에서 바로 공중으로 이어지게 합니다.
        state.position.y = Math.max(state.position.y, previousSurface.height);
        launchFromHill(previousHill, Math.abs(state.velocity));
      }
    }

    // T를 누르고 전진하면 앞바퀴를 드는 윌리 묘기를 수행합니다.
    // 바이크는 큰 각도, 자동차는 무게에 맞춘 낮은 각도로 연출됩니다.
    const canWheelie = state.grounded && !surface.ramp && state.velocity > 4;
    const wheelieTarget = keys.t && canWheelie ? (spec.type === "bike" ? .68 : .27) : 0;
    const wheelieResponse = wheelieTarget > state.wheelie ? 7.5 : 10;
    state.wheelie = THREE.MathUtils.lerp(state.wheelie, wheelieTarget, 1 - Math.exp(-wheelieResponse * dt));

    if (!state.grounded) {
      state.verticalVelocity -= PHYSICS.gravity * dt;
      state.position.y += state.verticalVelocity * dt;
      state.pitch += (-state.verticalVelocity * .0027 - state.pitch * .28) * dt;
      state.roll += steer * (spec.type === "bike" ? .11 : .045) * dt;
      if (state.position.y <= surface.height && state.verticalVelocity <= 0) {
        state.position.y = surface.height;
        state.verticalVelocity = 0;
        state.grounded = true;
        state.pitch = surfacePitchForHeading(surface, state.travelHeading);
        state.roll *= .22;
      }
    } else {
      state.position.y = surface.height;
      const targetSurfacePitch = surfacePitchForHeading(surface, state.travelHeading);
      state.pitch = THREE.MathUtils.lerp(state.pitch, targetSurfacePitch, 1 - Math.exp(-10 * dt));
      const lean = (spec.type === "bike" ? .24 : .065) + state.drift * (spec.type === "bike" ? .08 : .055);
      state.roll = THREE.MathUtils.lerp(state.roll, -steer * speedRatio * lean, 1 - Math.exp(-8 * dt));
      if (surface.ramp && surface.progress > .93) {
        const forwardSpeed = getRampForwardSpeed(surface.ramp);
        if (forwardSpeed > 5) launchFromRamp(surface.ramp, forwardSpeed);
      }
    }

    if (state.position.y < -8 || Math.abs(state.position.x) > WORLD_HALF_SIZE + 12 || Math.abs(state.position.z) > WORLD_HALF_SIZE + 12) {
      placeVehicle(0, -12, 0, "맵 밖으로 벗어나 스폰 지점으로 돌아왔습니다.");
    }

    state.wheelSpin += state.velocity * dt / .62;
    vehicleVisual.wheels.forEach(wheel => { wheel.rotation.x = state.wheelSpin; });
    state.steerVisual = THREE.MathUtils.lerp(state.steerVisual, steer * (.38 + state.drift * .16), 1 - Math.exp(-12 * dt));
    vehicleVisual.frontPivots.forEach(pivot => { pivot.rotation.y = state.steerVisual; });

    vehicle.position.copy(state.position);
    vehicle.rotation.y = state.heading;
    vehicleVisual.body.rotation.x = state.pitch - state.wheelie;
    vehicleVisual.body.rotation.z = state.roll;
    // 회전 중심 때문에 뒷바퀴가 지면 아래로 내려가지 않도록 차체를 함께 들어 줍니다.
    vehicleVisual.body.position.y = Math.sin(state.wheelie) * (spec.type === "bike" ? 1.48 : 1.35);
    vehicleVisual.boostJets.forEach((jet, index) => {
      jet.visible = state.boosting;
      if (state.boosting) {
        const pulse = 1 + Math.sin(performance.now() * .035 + index) * .24;
        jet.scale.set(.88 + pulse * .12, pulse, .88 + pulse * .12);
        jet.material.color.setHex(index % 2 ? 0x55e8ff : 0xffc247);
      }
    });
    blobShadow.visible = !state.inWater;
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
    const compactScreen = innerWidth < 650 || innerHeight < 540;
    const tinyScreen = innerWidth < 480 || innerHeight < 460;
    const sideViewAmount = Math.abs(Math.sin(cameraYaw));
    const distance = (tinyScreen ? 16.4 : compactScreen ? 13.2 : 10.8) + speedRatio * 3.3 + sideViewAmount * 1.6;
    const angle = state.heading + cameraYaw;
    desiredCamera.set(
      state.position.x - Math.sin(angle) * distance,
      state.position.y + (tinyScreen ? 6.35 : 5.2) + speedRatio + cameraPitch * 8,
      state.position.z - Math.cos(angle) * distance
    );
    camera.position.lerp(desiredCamera, 1 - Math.exp(-4.4 * dt));
    // 옆을 바라볼 때 전방 주시점을 줄여 차량이 화면 밖으로 밀리거나 잘리지 않게 합니다.
    const lookAhead = 4 * (1 - sideViewAmount * .92);
    cameraTarget.set(
      state.position.x + Math.sin(state.heading) * lookAhead,
      state.position.y + (tinyScreen ? .72 : 1.25),
      state.position.z + Math.cos(state.heading) * lookAhead
    );
    smoothedTarget.lerp(cameraTarget, 1 - Math.exp(-7 * dt));
    camera.lookAt(smoothedTarget);
    camera.fov = THREE.MathUtils.lerp(camera.fov, (tinyScreen ? 68 : compactScreen ? 64 : 59) + speedRatio * 7, 1 - Math.exp(-3 * dt));
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

  function renderGarageCategories() {
    $("#garage-categories").innerHTML = GARAGE_CATEGORIES.map(([id, label]) => `
      <button class="garage-category ${garageCategory === id ? "active" : ""}" type="button" data-category="${id}">
        ${label}
      </button>
    `).join("");
    $$(".garage-category").forEach(button => button.addEventListener("click", () => {
      garageCategory = button.dataset.category;
      const visibleVehicles = GARAGE_ORDER.filter(({ vehicleData }) =>
        garageCategory === "all" || vehicleData.type === garageCategory
      );
      if (!visibleVehicles.some(({ index }) => index === previewIndex) && visibleVehicles.length) {
        previewIndex = visibleVehicles[0].index;
        updateVehicleDetail();
      }
      renderGarageCategories();
      renderVehicleList();
    }));
  }

  function renderVehicleList() {
    const visibleVehicles = GARAGE_ORDER.filter(({ vehicleData }) =>
      garageCategory === "all" || vehicleData.type === garageCategory
    );
    $("#vehicle-list").innerHTML = visibleVehicles.map(({ vehicleData, index }) => `
      <button class="vehicle-card ${index === previewIndex ? "selected" : ""}" type="button" role="option"
        aria-selected="${index === previewIndex}" data-vehicle="${index}" style="${getGarageCardStyle(vehicleData)}">
        <span class="vehicle-thumb ${getGarageThumbClass(vehicleData)}"></span>
        <span><strong>${vehicleData.name}</strong><small>${vehicleData.className} · ${Math.round(vehicleData.maxSpeed * 3.6)} KM/H</small></span>
        <em class="${ownedVehicleIds.has(vehicleData.id) ? "owned" : "price"}">
          ${ownedVehicleIds.has(vehicleData.id) ? "보유중" : `💰 ${vehicleData.price.toLocaleString("ko-KR")}`}
        </em>
      </button>`).join("");
    $$(".vehicle-card").forEach(card => card.addEventListener("click", () => {
      previewIndex = Number(card.dataset.vehicle);
      updateVehicleDetail();
      renderVehicleList();
    }));
  }

  function updateVehicleDetail() {
    const def = VEHICLES[previewIndex];
    const garageRank = GARAGE_ORDER.findIndex(item => item.index === previewIndex) + 1;
    $("#vehicle-number").textContent = String(garageRank).padStart(2, "0");
    $("#vehicle-name").textContent = def.name;
    $("#vehicle-class").textContent = def.className;
    $("#vehicle-description").textContent = def.description;
    $("#vehicle-stats").innerHTML = Object.entries(def.scores).map(([name, score]) => `
      <div class="stat-row"><span>${name}</span><i style="--score:${score}%"></i><b>${score}</b></div>`).join("");
    const owned = ownedVehicleIds.has(def.id);
    $("#select-vehicle").innerHTML = previewIndex === selectedIndex
      ? `현재 선택됨 <span>✓</span>`
      : owned
        ? `이 차량 선택 <span>→</span>`
        : `💰 ${def.price.toLocaleString("ko-KR")}에 구매 <span>→</span>`;
    rebuildPreview();
  }

  function renderAccessories() {
    $("#color-options").innerHTML = PAINTS.map(paint => `
      <button class="color-swatch ${paint.value === selectedPaint ? "selected" : ""}" type="button"
        aria-label="${paint.name}" title="${paint.name}" data-color="${paint.value}" style="--swatch:#${paint.value.toString(16).padStart(6,"0")}"></button>`).join("");
    $$(".color-swatch").forEach(button => button.addEventListener("click", () => {
      selectedPaint = Number(button.dataset.color);
      saveCustomization();
      rebuildPlayerVehicle();
      rebuildPreview();
      renderAccessories();
      showToast("차량 컬러를 적용했습니다.");
    }));

    $("#accessory-options").innerHTML = ACCESSORIES.map(item => {
      const compatible = isAccessoryCompatible(item);
      const isEquipped = equipped.has(item.id);
      const status = compatible
        ? (isEquipped ? "장착됨 · 클릭해 해제" : "무료 장착")
        : (isEquipped ? "자동차 전용 · 보관 중" : "현재 차량 장착 불가");
      return `
        <button class="accessory-item ${isEquipped && compatible ? "selected" : ""} ${isEquipped && !compatible ? "stored" : ""}"
          type="button" data-accessory="${item.id}" ${compatible ? "" : "disabled"} aria-pressed="${isEquipped && compatible}">
          <span>${item.icon}</span><div><b>${item.name}</b><small>${status}</small></div>
        </button>`;
    }).join("");
    $$(".accessory-item").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.accessory;
      if (equipped.has(id)) equipped.delete(id); else equipped.add(id);
      saveCustomization();
      rebuildPlayerVehicle();
      rebuildPreview();
      renderAccessories();
      showToast(equipped.has(id) ? "장신구를 장착했습니다." : "장신구를 해제했습니다.");
    }));
  }

  function renderDestinations() {
    const elapsed = getSessionSeconds();
    $("#teleport-list").innerHTML = DESTINATIONS.map((destination, index) => `
      <article class="teleport-row ${elapsed < destination.unlockMinutes * 60 ? "locked" : ""}">
        <span class="teleport-row-icon">${destination.icon}</span>
        <div>
          <h3>${destination.name}</h3>
          <p>${elapsed < destination.unlockMinutes * 60 ? `${destination.unlockMinutes}분 접속 시 무료 해금` : destination.copy}</p>
        </div>
        <button class="teleport-action" type="button" data-destination="${index}"
          ${elapsed < destination.unlockMinutes * 60 ? "disabled" : ""}>
          ${elapsed < destination.unlockMinutes * 60 ? "잠김" : "이동"}
        </button>
      </article>`).join("");
    $$(".teleport-action:not(:disabled)").forEach(button => button.addEventListener("click", () => {
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
    if (name === "teleport") renderDestinations();
    if (name === "gifts") renderRewardBoard();
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
    const nextVehicle = VEHICLES[previewIndex];
    if (!ownedVehicleIds.has(nextVehicle.id)) {
      if (credits < nextVehicle.price) {
        showToast(`크레딧이 ${(nextVehicle.price - credits).toLocaleString("ko-KR")} 부족합니다.`);
        return;
      }
      credits -= nextVehicle.price;
      ownedVehicleIds.add(nextVehicle.id);
      updateMoneyDisplay();
      showToast(`${nextVehicle.name} 차량을 구매했습니다.`);
    }
    selectedIndex = previewIndex;
    selectedPaint = VEHICLES[selectedIndex].color;
    saveCustomization();
    rebuildPlayerVehicle();
    updateVehicleDetail();
    renderVehicleList();
    renderAccessories();
    placeVehicle(state.position.x, state.position.z, state.heading);
    showToast(`${currentVehicle().name}(으)로 즉시 변경했습니다.`);
  });

  $("#spawn-button").addEventListener("click", () => placeVehicle(0, -12, 0, `${currentVehicle().name}을(를) 스폰했습니다.`));

  // 게임 시작 후 흐른 실제 접속 시간을 계산합니다. 결제나 외부 계정은 사용하지 않습니다.
  const restoredSessionSeconds = Math.max(0, Number(savedGame.sessionSeconds) || 0);
  let sessionStartedAt = restoredSessionSeconds > 0 ? Date.now() - restoredSessionSeconds * 1000 : null;
  const claimedSessionRewards = new Set(
    Array.isArray(savedGame.claimedRewards)
      ? savedGame.claimedRewards.filter(index => Number.isInteger(index) && SESSION_REWARDS[index])
      : []
  );
  let lastTimedUiSecond = -1;

  function getSessionSeconds() {
    if (!sessionStartedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000));
  }

  function saveGame(notifyPlayer = false) {
    try {
      const quality = $("#quality-setting")?.value || "high";
      const sensitivity = Number($("#sensitivity-setting")?.value) || 55;
      const sound = !!$("#sound-setting")?.checked;
      const payload = {
        version: 1,
        savedAt: Date.now(),
        selectedVehicle: selectedIndex,
        ownedVehicles: [...ownedVehicleIds],
        paint: selectedPaint,
        accessories: [...equipped],
        credits: Math.floor(credits),
        position: {
          x: Number(state.position.x.toFixed(2)),
          z: Number(state.position.z.toFixed(2))
        },
        heading: Number(state.heading.toFixed(4)),
        sessionSeconds: getSessionSeconds(),
        claimedRewards: [...claimedSessionRewards],
        settings: { quality, sensitivity, sound }
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      savedGame = payload;
      const status = $("#save-status");
      if (status) {
        status.textContent = `마지막 저장 ${new Date(payload.savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
      }
      if (notifyPlayer) showToast("게임 진행 상황을 저장했습니다.");
      return true;
    } catch (error) {
      console.warn("게임을 저장하지 못했습니다.", error);
      if (notifyPlayer) showToast("저장할 수 없습니다. 브라우저 저장 권한을 확인해 주세요.");
      return false;
    }
  }

  function applySessionReward(index) {
    const reward = SESSION_REWARDS[index];
    const elapsed = getSessionSeconds();
    if (!reward || claimedSessionRewards.has(index) || elapsed < reward.minute * 60) return;

    claimedSessionRewards.add(index);
    if (reward.paint) selectedPaint = reward.paint;
    if (reward.accessory) equipped.add(reward.accessory);
    if (reward.all) {
      ACCESSORIES.forEach(item => equipped.add(item.id));
      selectedPaint = 0xeceff2;
    }
    if (reward.credits) addCredits(reward.credits, "", false);
    saveCustomization();
    saveGame(false);
    rebuildPlayerVehicle();
    rebuildPreview();
    renderAccessories();
    renderRewardBoard();
    showToast(`${reward.name} 보상을 받았습니다!`);
  }

  function renderRewardBoard() {
    const elapsed = getSessionSeconds();
    const roundedElapsedMinutes = elapsed > 0 ? Math.ceil(elapsed / 60) : 0;
    $("#session-time").textContent = `접속 ${roundedElapsedMinutes}분`;
    $("#reward-grid").innerHTML = SESSION_REWARDS.map((reward, index) => {
      const remainingSeconds = Math.max(0, reward.minute * 60 - elapsed);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      const claimed = claimedSessionRewards.has(index);
      const ready = remainingSeconds === 0 && !claimed;
      const buttonText = claimed ? "수령 완료 ✓" : ready ? "받기" : `${remainingMinutes}분 남음`;
      return `
        <article class="reward-card ${reward.featured ? "featured" : ""}">
          ${reward.featured ? `<b class="reward-card-badge">한정 보상!</b><span class="reward-icon">${reward.icon}</span>` : ""}
          <div class="reward-content">
            ${reward.featured ? "" : `<span class="reward-icon">${reward.icon}</span>`}
            <h3>${reward.name}</h3>
            <p>${reward.minute}분 접속 보상 · ${reward.copy}</p>
          </div>
          <button class="reward-claim ${claimed ? "claimed" : ready ? "ready" : ""}" type="button"
            data-reward="${index}" ${claimed || !ready ? "disabled" : ""}>${buttonText}</button>
        </article>`;
    }).join("");
    $$(".reward-claim.ready").forEach(button => button.addEventListener("click", () => applySessionReward(Number(button.dataset.reward))));
  }

  function updateTimedMenus() {
    const second = getSessionSeconds();
    if (second === lastTimedUiSecond) return;
    lastTimedUiSecond = second;
    const activePanel = $(".drawer-panel.active")?.dataset.panelContent;
    // 닫혀 있는 대형 메뉴 DOM을 매초 다시 만들지 않아 저사양 환경의 프레임 정지를 방지합니다.
    if (drawer.classList.contains("open") && activePanel === "gifts") renderRewardBoard();
    if (drawer.classList.contains("open") && activePanel === "teleport") renderDestinations();
  }

  function applyQuality(value, notifyPlayer = true) {
    renderer.setPixelRatio(qualityPixelRatio(value));
    renderer.shadowMap.enabled = true;
    const shadowSize = value === "low" ? 512 : value === "medium" ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.map?.dispose();
    if (notifyPlayer) showToast(`그래픽 품질: ${value === "high" ? "높음" : value === "medium" ? "중간" : "낮음"}`);
  }
  const savedSettings = savedGame.settings || {};
  const qualitySetting = ["low", "medium", "high"].includes(savedSettings.quality) ? savedSettings.quality : "high";
  const sensitivitySetting = THREE.MathUtils.clamp(Number(savedSettings.sensitivity) || 55, 20, 100);
  $("#quality-setting").value = qualitySetting;
  $("#sensitivity-setting").value = String(sensitivitySetting);
  $("#sound-setting").checked = !!savedSettings.sound;
  mouseSensitivity = sensitivitySetting / 100;
  applyQuality(qualitySetting, false);
  if (Number.isFinite(Number(savedGame.savedAt))) {
    $("#save-status").textContent = `마지막 저장 ${new Date(savedGame.savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  $("#quality-setting").addEventListener("change", event => {
    applyQuality(event.target.value);
    saveGame(false);
  });
  $("#sensitivity-setting").addEventListener("input", event => {
    mouseSensitivity = Number(event.target.value) / 100;
    saveGame(false);
  });
  $("#manual-save-button").addEventListener("click", () => saveGame(true));
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
  let soundEnabled = !!savedSettings.sound;

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
    saveGame(false);
    if (audioContext.state === "suspended") await audioContext.resume();
  });
  function updateAudio() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const ratio = Math.abs(state.velocity) / currentVehicle().maxSpeed;
    engineOscillator.frequency.setTargetAtTime(44 + ratio * 105 + (keys.w ? 11 : 0) + (state.boosting ? 38 : 0), now, .08);
    engineGain.gain.setTargetAtTime(soundEnabled && started && !paused && !uiOpen ? .012 + ratio * .026 + (state.boosting ? .012 : 0) : 0, now, .12);
  }

  // 키보드, 터치 입력. 폼 요소에 입력 중일 때는 게임 조작을 막습니다.
  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (["w","a","s","d","shift","control"," ","t","v","escape"].includes(key) && !["INPUT","SELECT"].includes(event.target.tagName)) event.preventDefault();
    if (key === "escape" && started) {
      if (drawer.classList.contains("open")) closeDrawer();
      else setPaused(!paused);
      return;
    }
    if (uiOpen || paused) return;
    if (key === "v" && state.position.distanceTo(new THREE.Vector3(0, state.position.y, -12)) < 11) {
      placeVehicle(0, -12, 0, `${currentVehicle().name}을(를) 스폰했습니다.`);
      return;
    }
    keys[key] = true;
  });
  window.addEventListener("keyup", event => { keys[event.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => { if (started && !paused && !uiOpen) setPaused(true); });

  $$("#mobile-controls button").forEach(button => {
    const set = value => {
      const key = button.dataset.key;
      keys[key] = value;
    };
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      try { button.setPointerCapture?.(event.pointerId); } catch (_) { /* 일부 모바일 브라우저는 캡처를 지원하지 않습니다. */ }
      set(true);
    });
    button.addEventListener("pointerup", event => {
      set(false);
      try {
        if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
      } catch (_) { /* 이미 해제된 포인터는 무시합니다. */ }
    });
    button.addEventListener("pointercancel", () => set(false));
    button.addEventListener("lostpointercapture", () => set(false));
  });
  window.addEventListener("pointercancel", () => {
    ["w", "a", "s", "d", " ", "control"].forEach(key => { keys[key] = false; });
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
    if (!sessionStartedAt) sessionStartedAt = Date.now();
    if (soundEnabled) {
      ensureAudio();
      audioContext.resume();
    }
    lastTimedUiSecond = -1;
    startScreen.classList.remove("visible");
    showToast(canRestorePosition ? "저장된 위치에서 게임을 이어갑니다." : "시작 패드에서 V 키 또는 버튼으로 차량을 다시 소환할 수 있습니다.");
    lastTime = performance.now();
  });

  renderGarageCategories();
  renderVehicleList();
  updateVehicleDetail();
  renderAccessories();
  renderDestinations();
  renderRewardBoard();

  // ────────────────────────────────────────────────────────────────────────
  // 메인 루프 / HUD / 반응형 리사이즈
  // ────────────────────────────────────────────────────────────────────────
  let lastTime = performance.now();
  let fpsFrames = 0;
  let fpsElapsed = 0;
  let autoSaveElapsed = 0;
  let lastRuntimeErrorAt = 0;
  let contextLost = false;
  const lastStablePosition = state.position.clone();

  function runFrameSystem(name, callback) {
    try {
      callback();
      return true;
    } catch (error) {
      const now = performance.now();
      if (now - lastRuntimeErrorAt > 2000) {
        lastRuntimeErrorAt = now;
        console.error(`${name} 처리 중 오류를 복구했습니다.`, error);
        showToast("일시적인 오류를 복구했습니다. 계속 주행할 수 있습니다.");
      }
      return false;
    }
  }

  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    contextLost = true;
    clearKeys();
    showToast("그래픽 장치를 복구하고 있습니다…");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    applyQuality($("#quality-setting").value, false);
    showToast("그래픽이 복구되었습니다.");
  });

  function updateUI(dt) {
    speedText.textContent = String(Math.round(state.displayedSpeed * 3.6)).padStart(3, "0");
    const boostPercent = Math.round(state.boostCharge * 100);
    boostValue.textContent = `${boostPercent}%`;
    boostStatus.classList.toggle("active", state.boosting);
    boostStatus.classList.toggle("empty", boostPercent <= 0);
    boostStatus.classList.toggle("ready", boostPercent >= 99);
    fpsFrames += 1;
    fpsElapsed += dt;
    if (fpsElapsed > .45) {
      fpsText.textContent = String(Math.round(fpsFrames / fpsElapsed));
      fpsFrames = 0;
      fpsElapsed = 0;
    }
    const driftReady = state.grounded && Math.abs(state.velocity) > 6;
    driftStatus.classList.toggle("locked", !driftReady);
    driftStatus.classList.toggle("ready", driftReady);
    driftStatus.querySelector("b").textContent = !state.grounded
      ? "공중 이동 중"
      : state.drift > .2
        ? "드리프트 중"
        : driftReady
          ? "드리프트 가능"
          : "속도를 올리세요";
    const distanceToPad = Math.hypot(state.position.x, state.position.z + 12);
    $("#interaction-prompt").classList.toggle("visible", started && !paused && !uiOpen && distanceToPad < 10);
    padRing.material.color.setHex(distanceToPad < 10 ? 0x6fffd0 : 0x16c7ff);
    padRing.rotation.z += dt * .35;
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    if (started && !paused && !uiOpen) {
      runFrameSystem("AI 차량", () => updateAIVehicles(dt));
      const physicsUpdated = runFrameSystem("플레이어 물리", () => updatePhysics(dt));
      if (
        physicsUpdated &&
        Number.isFinite(state.position.x) &&
        Number.isFinite(state.position.y) &&
        Number.isFinite(state.position.z)
      ) {
        lastStablePosition.copy(state.position);
      } else if (!physicsUpdated) {
        state.position.copy(lastStablePosition);
        state.velocity = 0;
        state.verticalVelocity = 0;
        state.knockback.set(0, 0);
        state.displayedSpeed = 0;
      }
      runFrameSystem("크레딧", () => updateMoneyPickups(dt));
      runFrameSystem("타이어 효과", () => {
        updateTireTracks(dt);
        updateDriftSmoke(dt);
      });
    }
    if (started) {
      autoSaveElapsed += dt;
      if (autoSaveElapsed >= 5) {
        autoSaveElapsed = 0;
        saveGame(false);
      }
    }
    runFrameSystem("카메라", () => updateCamera(dt));
    runFrameSystem("HUD", () => updateUI(dt));
    runFrameSystem("시간 메뉴", updateTimedMenus);
    runFrameSystem("오디오", updateAudio);
    if (previewVisual) previewVisual.root.rotation.y += dt * .28;
    if (drawer.classList.contains("open") && $(".drawer-panel.active")?.dataset.panelContent === "garage") {
      resizePreview();
      previewRenderer.render(previewScene, previewCamera);
    }
    if (!contextLost) runFrameSystem("3D 렌더링", () => renderer.render(scene, camera));
  }

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.setPixelRatio(qualityPixelRatio($("#quality-setting").value));
    resizePreview();
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("beforeunload", () => saveGame(false));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveGame(false);
  });

  placeVehicle(state.position.x, state.position.z, state.heading);
  updateCamera(1);
  loading.classList.remove("visible");
  requestAnimationFrame(animate);
})();
