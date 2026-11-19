// Paret de bloc en 3D: panells, volums i preses que s'hi enganxen amb el scroll.
window.PatiWall = (function () {
  const canvas = document.getElementById('wallCanvas');
  if (!canvas || !window.THREE) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const LOOK = new THREE.Vector3(0, 2.6, 0);

  const C = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const COL = {
    white: '#f4f1ea', gold: '#e3a20b', stone: '#76757b', ink: '#1d1d1f', ply: '#d9c59a', mat: '#2a2a2d',
  };

  // Llums
  scene.add(new THREE.HemisphereLight(C('#ffffff'), C('#b9a98a'), 0.75));
  const key = new THREE.DirectionalLight(C('#fff6e8'), 1.35);
  key.position.set(5, 9, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -3, near: 1, far: 30 });
  key.shadow.bias = -0.0006;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(C('#ffe2a0'), 0.35);
  rim.position.set(-6, 4, -4);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  // Terra que només rep ombra
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // Textura de panell: color, formes pintades i forats de rosca
  function panelTexture(w, h, base, shapes) {
    const ppu = 220;
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * ppu); cv.height = Math.round(h * ppu);
    const g = cv.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, cv.width, cv.height);
    shapes.forEach(([color, pts]) => {
      g.fillStyle = color; g.beginPath();
      pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x * cv.width, y * cv.height));
      g.closePath(); g.fill();
    });
    const step = 0.2 * ppu;
    g.fillStyle = 'rgba(0,0,0,.42)';
    for (let y = step / 2, r = 0; y < cv.height; y += step, r++) {
      for (let x = step / 2 + (r % 2 ? step / 2 : 0); x < cv.width; x += step) {
        g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill();
      }
    }
    const t = new THREE.CanvasTexture(cv);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  const edgeMat = new THREE.MeshStandardMaterial({ color: C(COL.ply), roughness: 0.85 });
  const DEPTH = 0.16;

  // Panells: [amplada, alçada, base, formes, posició final, rotació final]
  const panelDefs = [
    { w: 2.6, h: 4.3, base: COL.white, shapes: [[COL.stone, [[0, .55], [.75, 1], [0, 1]]], [COL.gold, [[.62, 0], [1, 0], [1, .28]]]],
      pos: [-3.25, 2.15, 0.15], rot: [0, 0.42, 0] },
    { w: 2.8, h: 4.5, base: COL.gold, shapes: [[COL.white, [[0, .18], [1, .52], [1, .72], [0, .38]]]],
      pos: [-0.55, 2.08, 0.82], rot: [0.38, 0, 0] },
    { w: 2.6, h: 4.1, base: COL.stone, shapes: [[COL.gold, [[.3, 0], [1, 0], [1, .62]]], [COL.white, [[0, .7], [.45, 1], [0, 1]]]],
      pos: [2.15, 2.05, 0.35], rot: [0.12, -0.42, 0] },
    { w: 1.7, h: 3.4, base: COL.white, shapes: [[COL.gold, [[0, 0], [1, .4], [1, .62], [0, .2]]]],
      pos: [3.95, 1.7, -0.5], rot: [0, -0.95, 0] },
  ];

  const panels = panelDefs.map((d, i) => {
    const front = new THREE.MeshStandardMaterial({ map: panelTexture(d.w, d.h, d.base, d.shapes), roughness: 0.78 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, DEPTH), [edgeMat, edgeMat, edgeMat, edgeMat, front, edgeMat]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const g = new THREE.Group();
    g.add(mesh);
    root.add(g);
    // inici: escampats i girats
    const s = i % 2 ? 1 : -1;
    g.userData = {
      d, from: { pos: [d.pos[0] * 2.2 + s * 2, d.pos[1] - 6 - i, d.pos[2] - 3], rot: [s * 1.2, s * 1.6, s * 0.6] },
    };
    return g;
  });

  // Matalassos
  const matMat = new THREE.MeshStandardMaterial({ color: C(COL.mat), roughness: 0.95 });
  const mats = new THREE.Group();
  [[-3.4, 2.3], [-0.55, 2.4], [2.3, 2.3], [4.6, 2.0]].forEach(([x, w]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.3, 2.1), matMat);
    m.position.set(x, 0.15, 1.55); m.castShadow = true; m.receiveShadow = true;
    mats.add(m);
  });
  root.add(mats);

  // Volums
  const volMat = {
    stone: new THREE.MeshStandardMaterial({ color: C(COL.stone), roughness: 0.7 }),
    white: new THREE.MeshStandardMaterial({ color: C(COL.white), roughness: 0.7 }),
    gold: new THREE.MeshStandardMaterial({ color: C(COL.gold), roughness: 0.65 }),
    ink: new THREE.MeshStandardMaterial({ color: C('#3a3a3e'), roughness: 0.6 }),
  };
  const pyramid = (r, h, sides, mat) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, sides), mat);
    m.rotation.x = Math.PI / 2;
    m.position.z = h / 2;
    const g = new THREE.Group(); g.add(m);
    m.castShadow = true; m.receiveShadow = true;
    return g;
  };
  const prism = (pts, depth, mat) => {
    const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
    const g = new THREE.Group(); g.add(m);
    return g;
  };
  // [panell, objecte, x, y, gir]
  const volumeDefs = [
    [0, pyramid(0.75, 0.55, 4, volMat.stone), 0.35, -0.6, Math.PI / 4],
    [1, prism([[-0.9, -0.5], [0.9, -0.5], [0, 0.7]], 0.42, volMat.white), -0.2, 0.9, 0.2],
    [1, pyramid(0.55, 0.45, 3, volMat.ink), 0.6, -1.2, 0.4],
    [2, pyramid(0.9, 0.6, 3, volMat.gold), -0.3, 0.3, -0.3],
    [3, prism([[-0.5, -0.4], [0.55, -0.1], [-0.2, 0.7]], 0.32, volMat.stone), 0.0, 0.5, 0],
  ];
  const volumes = volumeDefs.map(([pi, obj, x, y, rz], i) => {
    obj.rotation.z = rz;
    obj.userData = { home: new THREE.Vector3(x, y, DEPTH / 2), i };
    panels[pi].add(obj);
    return obj;
  });

  // Preses: icosaedres deformats, aixafats contra la paret
  function rockGeo(seed) {
    // esfera indexada + soroll suau: sense esquerdes i amb normals llises
    const geo = new THREE.SphereGeometry(1, 20, 14);
    const p = geo.attributes.position;
    const a = seed * 1.7, b = seed * 2.3, c = seed * 0.9;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.16 * Math.sin(2.6 * x + a) * Math.cos(2.1 * y + b) + 0.09 * Math.sin(3.4 * z + c + x);
      p.setXYZ(i, x * k, y * k, z * k);
    }
    geo.computeVertexNormals();
    return geo;
  }
  const rocks = [1, 2, 3, 4, 5].map(rockGeo);
  const holdColors = ['#2f6fd6', '#43c46a', '#7b4bc4', '#f5c400', '#1d1d1f', '#f07a1a', '#ffffff'].map(C);
  const routeMat = new THREE.MeshStandardMaterial({ color: C('#e8337d'), roughness: 0.6, emissive: C('#e8337d'), emissiveIntensity: 0 });

  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const holds = [];
  function addHold(pi, x, y, r, mat) {
    const m = new THREE.Mesh(rocks[holds.length % rocks.length], mat);
    m.scale.set(r * (0.9 + rand() * 0.5), r * (0.7 + rand() * 0.4), r * 0.45);
    m.castShadow = true;
    const g = new THREE.Group(); g.add(m);
    g.rotation.z = rand() * Math.PI;
    const home = new THREE.Vector3(x, y, DEPTH / 2 + r * 0.12);
    g.position.copy(home);
    g.userData = {
      home,
      from: new THREE.Vector3(x + (rand() - 0.5) * 5, y + (rand() - 0.5) * 4, 5 + rand() * 6),
      spin: (rand() - 0.5) * 8,
      rz: g.rotation.z,
    };
    panels[pi].add(g);
    holds.push(g);
    return g;
  }

  // preses de colors escampades
  panelDefs.forEach((d, pi) => {
    const n = [11, 9, 11, 6][pi];
    for (let k = 0; k < n; k++) {
      const x = (rand() - 0.5) * (d.w - 0.5), y = (rand() - 0.5) * (d.h - 0.6);
      const mat = new THREE.MeshStandardMaterial({ color: holdColors[Math.floor(rand() * holdColors.length)], roughness: 0.65 });
      addHold(pi, x, y, 0.1 + rand() * 0.1, mat);
    }
  });
  // el bloc rosa: zig-zag pel desplom fins al top
  const route = [[-0.9, -1.7], [0.3, -1.1], [-0.5, -0.35], [0.75, 0.3], [-0.15, 1.15], [0.45, 1.8]];
  const others = holds.slice();
  others.forEach((h) => { h.userData.c0 = h.children[0].material.color.clone(); });
  const GREY = C('#bdbab2');
  const routeHolds = route.map(([x, y], i) => addHold(1, x, y, i === route.length - 1 ? 0.27 : 0.2, routeMat));
  const topHold = routeHolds[routeHolds.length - 1];

  // Punts per a les etiquetes
  const anchors = {
    panel: { obj: panels[1], v: new THREE.Vector3(1.4, -1.2, 0.1) },
    volume: { obj: volumes[3], v: new THREE.Vector3(0, 0, 0.6) },
    holds: { obj: panels[0], v: new THREE.Vector3(-0.4, 0.6, 0.2) },
    top: { obj: topHold, v: new THREE.Vector3(0, 0, 0.1) },
  };

  let progress = 0, visible = true;
  const t0 = performance.now();
  const clamp = (x) => Math.min(Math.max(x, 0), 1);
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const back = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.25;
    const dist = (wide ? 17.5 : 15.5) * Math.min(1.85, Math.max(1, 1.3 / (w / h)));
    const sx = wide ? -2.2 : 0; // en pantalla ampla, paret cap a la dreta i text a l'esquerra
    camera.position.set(sx, 4.2, dist);
    camera.lookAt(LOOK.x + sx, LOOK.y, LOOK.z);
    camera.updateProjectionMatrix();
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = (performance.now() - t0) / 1000;
    const p = progress;

    // Vista: entra de costat i acaba de tres quarts
    const intro = ease(p / 0.22);
    root.rotation.y = lerp(-1.1, 0.5, intro) - p * 0.55 + Math.sin(t * 0.5) * 0.02;
    root.position.y = -0.2;
    root.scale.setScalar(lerp(0.82, 1, intro));

    // 1. Panells es munten (0.05 → 0.32)
    panels.forEach((g, i) => {
      const { d, from } = g.userData;
      const e = back((p - 0.05 - i * 0.045) / 0.16);
      g.position.set(lerp(from.pos[0], d.pos[0], e), lerp(from.pos[1], d.pos[1], e), lerp(from.pos[2], d.pos[2], e));
      g.rotation.set(lerp(from.rot[0], d.rot[0], e), lerp(from.rot[1], d.rot[1], e), lerp(from.rot[2], d.rot[2], e));
      g.visible = p > 0.02 + i * 0.03;
    });
    mats.position.y = lerp(-3, 0, ease((p - 0.2) / 0.12));

    // 2. Volums (0.36 → 0.5)
    volumes.forEach((v, i) => {
      const e = back((p - 0.36 - i * 0.025) / 0.08);
      v.scale.setScalar(Math.max(e, 0.0001));
      v.position.set(v.userData.home.x, v.userData.home.y, v.userData.home.z + (1 - e) * 2);
    });

    // 3. Preses volen cap a la paret (0.52 → 0.76)
    const N = holds.length;
    holds.forEach((h, i) => {
      const { home, from, spin, rz } = h.userData;
      const e = ease((p - 0.52 - (i / N) * 0.16) / 0.08);
      h.position.set(lerp(from.x, home.x, e), lerp(from.y, home.y, e), lerp(from.z, home.z, e));
      h.rotation.z = rz + (1 - e) * spin;
      h.rotation.x = (1 - e) * spin * 0.5;
      h.visible = e > 0.001;
    });

    // 4. Top: el bloc rosa s'il·lumina presa a presa (0.78 → 0.92)
    const glow = clamp((p - 0.78) / 0.1);
    routeMat.emissiveIntensity = glow * (0.45 + 0.25 * Math.sin(t * 4));
    others.forEach((h) => h.children[0].material.color.copy(h.userData.c0).lerp(GREY, glow * 0.75));
    routeHolds.forEach((h, i) => {
      const k = clamp((p - 0.78 - i * 0.018) / 0.04);
      h.children[0].position.z = Math.sin(k * Math.PI) * 0.12;
    });

    renderer.render(scene, camera);
  }

  function project(name) {
    const a = anchors[name];
    const v = a.v.clone();
    a.obj.localToWorld(v);
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * canvas.clientHeight };
  }

  window.addEventListener('resize', resize);
  resize();
  frame();

  return {
    setProgress(p) { progress = p; },
    setVisible(v) { visible = v; },
    project,
    resize,
  };
})();
