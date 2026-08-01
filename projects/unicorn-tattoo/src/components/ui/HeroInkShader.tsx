'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * A subtle WebGL grade laid over the hero film: the studio's petrol-teal pushed
 * into the shadows and highlights, plus fine animated grain. It MIXES toward the
 * grade (keeps ~66% of the original frame) so the real footage stays authentic.
 *
 * It samples the SAME <video> element as HeroVideo (no second download) and is
 * gated hard: fine pointer, no reduced-motion, wide viewport, enough cores/RAM,
 * no data-saver. If WebGL is unavailable or anything throws, it renders nothing
 * and the untouched film shows through.
 */
const VERT = `
attribute vec2 p;
varying vec2 v;
void main() { v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
varying vec2 v;
uniform sampler2D tex;
uniform vec2 res;
uniform float t;
uniform float va;   // video aspect (w/h)
uniform float ca;   // canvas aspect (w/h)
float hash(vec2 x) { return fract(sin(dot(x, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  // object-cover UV: fill the quad, crop the overflow, keep centre.
  vec2 uv = vec2(v.x, 1.0 - v.y);
  vec2 s = vec2(1.0);
  if (ca > va) { s.y = va / ca; } else { s.x = ca / va; }
  uv = (uv - 0.5) * s + 0.5;

  vec3 c = texture2D(tex, uv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));

  vec3 shadow = vec3(0.043, 0.086, 0.106); // deep petrol
  vec3 mid    = vec3(0.180, 0.588, 0.690); // brand teal #2E96B0
  vec3 hi     = vec3(0.827, 0.909, 0.933); // cool bone
  vec3 duo = l < 0.5 ? mix(shadow, mid, l * 2.0) : mix(mid, hi, (l - 0.5) * 2.0);

  vec3 graded = mix(c, duo, 0.34);
  float g = hash(uv * res + fract(t)) - 0.5;
  graded += g * 0.05;

  gl_FragColor = vec4(graded, 1.0);
}
`;

export default function HeroInkShader({
  videoRef
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mm = (q: string) => Boolean(window.matchMedia?.(q).matches);
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    const ok =
      mm('(pointer: fine)') &&
      !mm('(prefers-reduced-motion: reduce)') &&
      window.innerWidth >= 1024 &&
      (nav.hardwareConcurrency ?? 8) >= 4 &&
      (nav.deviceMemory ?? 8) >= 4 &&
      !nav.connection?.saveData;
    if (ok) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext('webgl', { alpha: false, antialias: false, depth: false }) ||
        canvas.getContext('experimental-webgl', {
          alpha: false
        })) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (!gl) return;
    const g = gl;

    const compile = (type: number, src: string) => {
      const sh = g.createShader(type);
      if (!sh) return null;
      g.shaderSource(sh, src);
      g.compileShader(sh);
      if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) {
        g.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(g.VERTEX_SHADER, VERT);
    const fs = compile(g.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = g.createProgram();
    if (!prog) return;
    g.attachShader(prog, vs);
    g.attachShader(prog, fs);
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) return;
    g.useProgram(prog);

    const buf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, buf);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    const pLoc = g.getAttribLocation(prog, 'p');
    g.enableVertexAttribArray(pLoc);
    g.vertexAttribPointer(pLoc, 2, g.FLOAT, false, 0, 0);

    const tex = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, tex);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);

    const uRes = g.getUniformLocation(prog, 'res');
    const uT = g.getUniformLocation(prog, 't');
    const uVA = g.getUniformLocation(prog, 'va');
    const uCA = g.getUniformLocation(prog, 'ca');
    g.uniform1i(g.getUniformLocation(prog, 'tex'), 0);

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        g.viewport(0, 0, w, h);
      }
    };

    let raf = 0;
    let start = 0;
    let painted = false;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      threshold: 0.01
    });
    io.observe(canvas);

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      // A paused film (autoplay blocked -> the canvas fallback is running
      // underneath) must never leave a frozen opaque grade on top: hide.
      if (video.paused) {
        if (canvas.style.opacity !== '0') canvas.style.opacity = '0';
        return;
      }
      if (!visible || document.hidden || video.readyState < 2) return;
      if (!start) start = ts;
      resize();
      try {
        g.bindTexture(g.TEXTURE_2D, tex);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, video);
      } catch {
        return;
      }
      g.uniform2f(uRes, canvas.width, canvas.height);
      g.uniform1f(uT, (ts - start) / 1000);
      g.uniform1f(uVA, (video.videoWidth || 16) / (video.videoHeight || 9));
      g.uniform1f(uCA, canvas.width / canvas.height);
      g.drawArrays(g.TRIANGLES, 0, 3);
      if (!painted) {
        painted = true;
        setReady(true);
      }
      if (canvas.style.opacity !== '1') canvas.style.opacity = '1';
    };
    raf = requestAnimationFrame(draw);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      try {
        g.deleteTexture(tex);
        g.deleteBuffer(buf);
        g.deleteProgram(prog);
        g.deleteShader(vs);
        g.deleteShader(fs);
        g.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        /* teardown best-effort */
      }
    };
  }, [enabled, videoRef]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-1000"
      style={{ opacity: ready ? 1 : 0 }}
    />
  );
}
