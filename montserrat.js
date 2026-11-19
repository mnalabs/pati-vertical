// Montserrat real: relleu de 5 m i ortofoto de l'ICGC (CC BY 4.0) en 3D. La càmera puja fins a Sant Jeroni amb el scroll.
window.PatiPeak = (function () {
  const canvas = document.getElementById('peakCanvas');
  if (!canvas || !window.THREE) return null;

  const mobile = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 5, 60000);
  const SUN = new THREE.Vector3(0.82, 0.26, -0.28).normalize(); // sol baix de llevant (+x est, +z sud)
  const FOG = new THREE.Color('#d9b48f');

  // ---------- Cel ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(40000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { sunDir: { value: SUN } },
    vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vW; uniform vec3 sunDir;
      void main(){
        float h = clamp(vW.y, -0.1, 1.0);
        float s = max(dot(vW, sunDir), 0.0);
        vec3 hor = mix(vec3(0.86,0.72,0.60), vec3(1.0,0.74,0.48), pow(s, 3.0));
        vec3 c = mix(hor, vec3(0.62,0.70,0.80), smoothstep(0.02, 0.22, h));
        c = mix(c, vec3(0.33,0.49,0.72), smoothstep(0.2, 0.75, h));
        c += vec3(1.0,0.80,0.55) * (pow(s, 900.0) * 3.0 + pow(s, 18.0) * 0.28);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  scene.add(sky);

  let ready = false, progress = 0, shown = 0, visible = false, started = false;
  let terrainH = null, META = null;
  let camPath, lookPath;

  // Alçada del terreny a una posició local (metres)
  function heightAt(x, z) {
    if (!terrainH) return 0;
    const u = (x / META.widthM + 0.5) * (META.w - 1), v = (z / META.heightM + 0.5) * (META.h - 1);
    const i = Math.max(0, Math.min(META.w - 2, Math.floor(u))), j = Math.max(0, Math.min(META.h - 2, Math.floor(v)));
    const fu = Math.min(1, Math.max(0, u - i)), fv = Math.min(1, Math.max(0, v - j));
    const H = (a, b) => terrainH[b * META.w + a] * META.scale;
    return (H(i, j) * (1 - fu) + H(i + 1, j) * fu) * (1 - fv) + (H(i, j + 1) * (1 - fu) + H(i + 1, j + 1) * fu) * fv;
  }

  async function load() {
    started = true;
    const base = 'media/montserrat/';
    const [meta, bin] = await Promise.all([
      fetch(base + 'meta.json').then((r) => r.json()),
      fetch(base + 'dem.bin').then((r) => r.arrayBuffer()),
    ]);
    META = meta; terrainH = new Uint16Array(bin);
    const tex = await new Promise((res) => new THREE.TextureLoader().load(base + (mobile ? 'orto-2k.jpg' : 'orto.jpg'), res));
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;

    // Malla del relleu
    const step = mobile ? 2 : 1;
    const sx = Math.floor((META.w - 1) / step), sz = Math.floor((META.h - 1) / step);
    const geo = new THREE.PlaneGeometry(META.widthM, META.heightM, sx, sz);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    const EDGE_H = META.minH + 60;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), z = pos.getZ(k);
      const u = uv.getX(k), v = 1 - uv.getY(k);
      const e = Math.min(u, 1 - u, v, 1 - v);
      const fall = THREE.MathUtils.smoothstep(e, 0.0, 0.05); // vores que baixen suaument
      pos.setY(k, THREE.MathUtils.lerp(EDGE_H, heightAt(x, z), fall));
    }
    geo.computeVertexNormals();

    const mat = new THREE.ShaderMaterial({
      extensions: { derivatives: true },
      uniforms: {
        orto: { value: tex }, sunDir: { value: SUN }, fogCol: { value: FOG },
        camPos: { value: camera.position }, density: { value: 0.00026 },
      },
      vertexShader: `
        varying vec2 vUv; varying vec3 vW; varying vec3 vN;
        void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vN = normalize(normal);
          gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        uniform sampler2D orto; uniform vec3 sunDir; uniform vec3 fogCol; uniform vec3 camPos; uniform float density;
        varying vec2 vUv; varying vec3 vW; varying vec3 vN;
        float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float vnoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
        float fbm(vec3 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*vnoise(p); p*=2.03; a*=.5; } return v; }
        void main(){
          vec3 N = normalize(vN);
          // relleu fi de conglomerat (bump) a les zones dretes
          float st0 = smoothstep(0.35, 0.8, 1.0 - N.y);
          float hb = fbm(vec3(vW.x*0.05, vW.y*0.42, vW.z*0.05))*4.5 + fbm(vW*0.35)*1.8 + fbm(vW*1.3)*0.35;
          vec3 dpx = dFdx(vW), dpy = dFdy(vW);
          float dhx = dFdx(hb), dhy = dFdy(hb);
          vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
          float det = dot(dpx, r1);
          vec3 g = sign(det) * (dhx * r1 + dhy * r2);
          N = normalize(mix(N, normalize(abs(det) * N - g), 0.25 + 0.75 * st0));
          vec3 alb = texture2D(orto, vUv).rgb;
          float steep = smoothstep(0.42, 0.85, 1.0 - N.y);
          // conglomerat: estrats horitzontals i còdols a les parets verticals
          float strata = fbm(vec3(vW.x*0.02, vW.y*0.35, vW.z*0.02));
          float pebble = fbm(vW*0.45);
          vec3 rock = vec3(0.70,0.60,0.51) * (0.78 + 0.3*strata) * (0.85 + 0.25*pebble);
          alb = mix(alb, mix(alb, rock, 0.55), steep);
          alb *= 0.9 + 0.2*fbm(vW*0.08);
          float sun = max(dot(N, sunDir), 0.0);
          float sky = 0.5 + 0.5*N.y;
          vec3 col = alb * (vec3(1.0,0.86,0.70)*sun*0.95 + vec3(0.62,0.70,0.82)*sky*0.55 + 0.12);
          float d = length(vW - camPos);
          vec3 vdir = normalize(vW - camPos);
          float f = 1.0 - exp(-d*density);
          vec3 fc = mix(fogCol, vec3(1.0,0.80,0.58), pow(max(dot(vdir, sunDir),0.0), 6.0)*0.6);
          col = mix(col, fc, f);
          gl_FragColor = vec4(pow(col, vec3(0.95)), 1.0);
        }`,
    });
    scene.add(new THREE.Mesh(geo, mat));

    // Terra llunyana sota la boira
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000), new THREE.ShaderMaterial({
      uniforms: { fogCol: { value: FOG }, camPos: { value: camera.position } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: 'uniform vec3 fogCol; uniform vec3 camPos; varying vec3 vW; void main(){ float f = 1.0 - exp(-length(vW-camPos)*0.00021); gl_FragColor = vec4(mix(vec3(0.27,0.29,0.18), fogCol, max(f, 0.35)), 1.0); }',
    }));
    skirt.rotation.x = -Math.PI / 2; skirt.position.y = EDGE_H - 2;
    scene.add(skirt);

    // Sant Jeroni: el punt més alt del relleu
    let best = 0, bi = 0;
    for (let k = 0; k < terrainH.length; k++) if (terrainH[k] > best) { best = terrainH[k]; bi = k; }
    const sjx = ((bi % META.w) / (META.w - 1) - 0.5) * META.widthM;
    const sjz = (Math.floor(bi / META.w) / (META.h - 1) - 0.5) * META.heightM;
    const sjy = best * META.scale;
    const lim = (x, z) => [Math.max(-META.widthM / 2 + 300, Math.min(META.widthM / 2 - 300, x)), Math.max(-META.heightM / 2 + 300, Math.min(META.heightM / 2 - 300, z))];
    const P = (dx, dz, y) => { const [x, z] = lim(sjx + dx, sjz + dz); return new THREE.Vector3(x, y, z); };
    // des del Bages (nord): cara nord de Sant Jeroni, cim i agulles cap al sud
    camPath = new THREE.CatmullRomCurve3([
      P(420, -1900, sjy - 430), P(300, -1350, sjy - 320), P(160, -800, sjy - 170),
      P(110, -560, sjy + 110), P(40, -160, sjy + 200), P(-40, 300, sjy + 240),
    ]);
    lookPath = new THREE.CatmullRomCurve3([
      P(0, 0, sjy - 260), P(0, 0, sjy - 200), P(0, 60, sjy - 140),
      P(30, 300, sjy - 180), P(150, 1500, sjy - 430), P(400, 4200, sjy - 760),
    ]);
    ready = true;
    resize();
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 62 : 45;
    camera.updateProjectionMatrix();
  }

  const tmp = new THREE.Vector3();
  const t0 = performance.now();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || !ready) return;
    shown += (progress - shown) * 0.07;
    const t = (performance.now() - t0) / 1000;
    const p = THREE.MathUtils.smoothstep(shown, 0, 1);
    camPath.getPoint(p, camera.position);
    camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 45);
    camera.position.y += Math.sin(t * 0.5) * 2;
    lookPath.getPoint(p, tmp);
    camera.lookAt(tmp);
    renderer.render(scene, camera);
  }
  addEventListener('resize', resize);
  resize();
  frame();

  return {
    preload() { if (!started) load(); },
    setProgress(v) { progress = v; },
    setVisible(v) { visible = v; if (v) { if (!started) load(); resize(); } },
  };
})();
