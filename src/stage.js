// The WebGL stage: draws the scroll-scrubbed video frames with effects that a plain
// <img> or <video> can't do:
//   - two frames cross-fading (switching sequences without a cut)
//   - a giant word rendered BEHIND the burger (the burger is masked out of it)
//   - heat haze, RGB split + shake driven by scroll speed
//   - glowing embers rising through the scene
import {
  WebGLRenderer, Scene, OrthographicCamera, Mesh, PlaneGeometry, ShaderMaterial, Texture, CanvasTexture,
  Vector2, Vector4, Color, BufferGeometry, BufferAttribute, Points, AdditiveBlending, LinearFilter,
} from 'three';

const BG = new Color(10 / 255, 10 / 255, 5 / 255); // the exact black of the AI videos

function frameTexture() {
  const t = new Texture();
  t.minFilter = t.magFilter = LinearFilter;
  t.generateMipmaps = false;
  t.flipY = false; // shader uses top-left origin, like the image itself
  return t;
}

export function wordTexture(word) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 600;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  if (word) {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    let size = 560;
    ctx.font = `${size}px Anton, Impact, sans-serif`;
    const w = ctx.measureText(word).width;
    if (w > 2000) {
      size *= 2000 / w;
      ctx.font = `${size}px Anton, Impact, sans-serif`;
    }
    ctx.fillText(word, 1024, 300 + size * 0.36);
  }
  const t = new CanvasTexture(c);
  t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  t.flipY = false;
  return t;
}

const vert = /* glsl */ `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */ `
  precision highp float;
  uniform sampler2D uA; uniform sampler2D uB; uniform float uMix;
  uniform vec4 uRectA; uniform vec4 uRectB;          // x, y, w, h in px (top-left origin)
  uniform vec2 uRes; uniform float uTime; uniform float uVel; uniform float uHeat; uniform vec2 uShake;
  uniform sampler2D uWA; uniform sampler2D uWB; uniform float uWMix; uniform float uWAlpha; uniform vec3 uWColor; uniform vec4 uWRect;
  uniform vec3 uBg; uniform float uFade;

  vec3 sampleFrame(sampler2D t, vec4 r, vec2 px) {
    vec2 uv = (px - r.xy) / r.zw;
    // heat haze: rising shimmer, strongest above the food
    float h = uHeat * smoothstep(0.75, 0.05, uv.y);
    uv.x += sin(uv.y * 60.0 - uTime * 5.0) * 0.0016 * h + sin(uv.y * 23.0 + uTime * 2.3) * 0.0012 * h;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return uBg;
    vec2 split = vec2(clamp(uVel, -1.0, 1.0) * 0.006, 0.0);
    vec3 c = vec3(texture2D(t, uv + split).r, texture2D(t, uv).g, texture2D(t, uv - split).b);
    float edge = smoothstep(0.0, 0.05, min(uv.x, 1.0 - uv.x)) * smoothstep(0.0, 0.05, min(uv.y, 1.0 - uv.y));
    return mix(uBg, c, edge);
  }

  void main() {
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) + uShake;
    vec3 a = sampleFrame(uA, uRectA, px);
    vec3 b = sampleFrame(uB, uRectB, px);
    vec3 col = mix(a, b, uMix);

    // the word lives behind the food: hide it wherever the frame is brighter than the backdrop
    vec2 wuv = (px - uWRect.xy) / uWRect.zw;
    float w = 0.0;
    if (wuv.x > 0.0 && wuv.x < 1.0 && wuv.y > 0.0 && wuv.y < 1.0) w = mix(texture2D(uWA, wuv).r, texture2D(uWB, wuv).r, uWMix);
    float food = smoothstep(0.075, 0.17, max(col.r, max(col.g, col.b)));
    col += uWColor * w * uWAlpha * (1.0 - food);

    vec2 q = gl_FragCoord.xy / uRes - 0.5;
    col *= 1.0 - dot(q, q) * 0.55;          // vignette
    gl_FragColor = vec4(col * uFade, 1.0);
  }`;

function embers(n) {
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = Math.random() * 2 - 1;
    pos[i * 3 + 1] = Math.random() * 2 - 1;
    pos[i * 3 + 2] = Math.random();
    seed[i] = Math.random();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new BufferAttribute(seed, 1));
  const m = new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uLift: { value: 0 }, uAlpha: { value: 0 }, uPx: { value: 1 }, uAspect: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uLift; uniform float uPx; uniform float uAspect;
      varying float vA; varying float vHot;
      void main(){
        vec3 p = position;
        float speed = 0.05 + aSeed * 0.12;
        p.y = mod(p.y + 1.0 + uTime * speed + uLift * (0.4 + aSeed), 2.0) - 1.0;
        p.x += sin(uTime * (0.6 + aSeed) + aSeed * 50.0) * 0.04 + sin(p.y * 3.0 + aSeed * 9.0) * 0.03;
        vA = smoothstep(-1.0, -0.6, p.y) * smoothstep(1.0, 0.4, p.y) * (0.4 + 0.6 * sin(uTime * (2.0 + aSeed * 4.0) + aSeed * 20.0) * 0.5 + 0.5);
        vHot = aSeed;
        gl_PointSize = (1.5 + p.z * 4.5) * uPx;
        gl_Position = vec4(p.x, p.y, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlpha; varying float vA; varying float vHot;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 c = mix(vec3(1.0, 0.36, 0.08), vec3(1.0, 0.78, 0.35), vHot);
        gl_FragColor = vec4(c, a * a * vA * uAlpha);
      }`,
  });
  return new Points(g, m);
}

export class Stage {
  constructor(canvas, { rec = false } = {}) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: rec, powerPreference: 'high-performance' });
    this.maxDpr = rec ? 3 : 1.5;
    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.texA = frameTexture();
    this.texB = frameTexture();
    this.empty = wordTexture('');
    this.u = {
      uA: { value: this.texA }, uB: { value: this.texB }, uMix: { value: 0 },
      uRectA: { value: new Vector4() }, uRectB: { value: new Vector4() },
      uRes: { value: new Vector2(1, 1) }, uTime: { value: 0 }, uVel: { value: 0 }, uHeat: { value: 0 }, uShake: { value: new Vector2() },
      uWA: { value: this.empty }, uWB: { value: this.empty }, uWMix: { value: 0 }, uWAlpha: { value: 0 },
      uWColor: { value: new Color('#c4281a') }, uWRect: { value: new Vector4() },
      uBg: { value: BG }, uFade: { value: 1 },
    };
    const quad = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms: this.u, vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false }));
    quad.frustumCulled = false;
    this.scene.add(quad);
    this.embers = embers(rec ? 420 : 300);
    this.embers.frustumCulled = false;
    this.scene.add(this.embers);
    this.current = { A: null, B: null };
  }

  setFrames(imgA, imgB) {
    if (imgA && imgA !== this.current.A) {
      this.texA.image = imgA;
      this.texA.needsUpdate = true;
      this.current.A = imgA;
    }
    if (imgB && imgB !== this.current.B) {
      this.texB.image = imgB;
      this.texB.needsUpdate = true;
      this.current.B = imgB;
    }
  }

  resize(w, h) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr));
    this.renderer.setSize(w, h, false);
    const pr = this.renderer.getPixelRatio();
    this.pr = pr;
    // shader works in CSS px; gl_FragCoord is in device px, so scale the rects instead
    this.embers.material.uniforms.uPx.value = pr * Math.max(0.8, h / 900);
  }

  /** rects in CSS px; everything converted to device px here */
  draw({ rectA, rectB, mix, word, time, vel, heat, shake, embers, fade }) {
    const pr = this.pr || 1;
    const s = (r, v) => v.set(r.x * pr, r.y * pr, r.w * pr, r.h * pr);
    const u = this.u;
    s(rectA, u.uRectA.value);
    s(rectB || rectA, u.uRectB.value);
    u.uMix.value = mix;
    u.uRes.value.set(this.renderer.domElement.width, this.renderer.domElement.height);
    u.uTime.value = time;
    u.uVel.value = vel;
    u.uHeat.value = heat;
    u.uShake.value.set(shake.x * pr, shake.y * pr);
    u.uFade.value = fade;
    u.uWA.value = word.a || this.empty;
    u.uWB.value = word.b || this.empty;
    u.uWMix.value = word.mix;
    u.uWAlpha.value = word.alpha;
    s(word.rect, u.uWRect.value);
    const em = this.embers.material.uniforms;
    em.uTime.value = time;
    em.uLift.value = embers.lift;
    em.uAlpha.value = embers.alpha;
    this.renderer.render(this.scene, this.camera);
  }
}
