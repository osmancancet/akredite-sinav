"use client";

import * as React from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

// Kriptografik Kafes — şifreli kasanın canlı 3B temsili.
// * Jeodezik küre üzerinde noktalar (kayıtlar) + ince kenarlar (anahtar türetme ağı)
// * pulseKey her değiştiğinde yüzeyde bir dalga yayılır (yeni AES-GCM yazımı)
// * Yörüngelerde dolaşan küçük paketler = şifreli bloklar
// Erişilebilirlik/performans: prefers-reduced-motion'da tek kare çizer, ekran dışı
// veya sekme gizliyken döngüyü durdurur, piksel oranı 2 ile sınırlıdır.

type Variant = "light" | "dark";

const PALETTE: Record<Variant, { point: string; wave: string; line: string; lineOpacity: number; core: string; packet: string }> = {
  light: { point: "#1f8f83", wave: "#0b4f48", line: "#a1a1aa", lineOpacity: 0.3, core: "#5cc2b4", packet: "#18181b" },
  dark: { point: "#5cc2b4", wave: "#d9f5f0", line: "#5cc2b4", lineOpacity: 0.14, core: "#1f8f83", packet: "#e4e4e7" },
};

const POINT_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uPulseStart;
  uniform vec3 uPulseOrigin;
  uniform float uPixelRatio;
  uniform float uSize;
  varying float vWave;
  varying float vDepth;
  void main() {
    vec3 p = position;
    float t = uTime - uPulseStart;
    float d = acos(clamp(dot(normalize(p), uPulseOrigin), -1.0, 1.0));
    float front = t * 1.6;
    float wave = exp(-pow((d - front) * 5.0, 2.0)) * smoothstep(3.2, 0.0, t);
    float idle = 0.5 + 0.5 * sin(uTime * 0.9 + p.x * 3.0 + p.y * 2.0);
    vWave = wave;
    p *= 1.0 + wave * 0.06;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = smoothstep(-6.0, -2.0, mv.z);
    gl_PointSize = (uSize + wave * 7.0 + idle * 1.2) * uPixelRatio * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uWaveColor;
  varying float vWave;
  varying float vDepth;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.3, r) * mix(0.28, 1.0, vDepth);
    vec3 col = mix(uColor, uWaveColor, clamp(vWave * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(col, alpha);
  }
`;

export function CryptoLattice({ pulseKey = 0, variant = "light", className }: { pulseKey?: number; variant?: Variant; className?: string }) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const pulseRef = React.useRef<(() => void) | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const colors = PALETTE[variant];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 6.2);

    const group = new THREE.Group();
    scene.add(group);

    // Jeodezik kabuk — tekil köşeler nokta, kenarlar çizgi
    const shell = new THREE.IcosahedronGeometry(1.6, 4);
    const pos = shell.getAttribute("position");
    const seen = new Map<string, THREE.Vector3>();
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      seen.set(`${v.x.toFixed(4)}|${v.y.toFixed(4)}|${v.z.toFixed(4)}`, v);
    }
    const unique = Array.from(seen.values());
    const pointGeo = new THREE.BufferGeometry().setFromPoints(unique);
    const pointMat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERTEX,
      fragmentShader: POINT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPulseStart: { value: -10 },
        uPulseOrigin: { value: new THREE.Vector3(0, 1, 0) },
        uPixelRatio: { value: pixelRatio },
        uSize: { value: variant === "light" ? 3.6 : 3.0 },
        uColor: { value: new THREE.Color(colors.point) },
        uWaveColor: { value: new THREE.Color(colors.wave) },
      },
    });
    const points = new THREE.Points(pointGeo, pointMat);
    group.add(points);

    const edgeGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.6, 2), 1);
    const edgeMat = new THREE.LineBasicMaterial({ color: colors.line, transparent: true, opacity: colors.lineOpacity, depthWrite: false });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    group.add(edges);

    // Çekirdek: anahtar — yavaş dönen iç tel kafes
    const coreGeo = new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.55, 0));
    const coreMat = new THREE.LineBasicMaterial({ color: colors.core, transparent: true, opacity: 0.85 });
    const core = new THREE.LineSegments(coreGeo, coreMat);
    group.add(core);

    // Şifreli paketler: büyük çemberlerde dolaşan küçük noktalar
    const PACKETS = 26;
    const orbits = Array.from({ length: PACKETS }, (_, i) => {
      const axis = new THREE.Vector3(Math.sin(i * 2.399), Math.cos(i * 1.7), Math.sin(i * 0.77)).normalize();
      const start = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), i).cross(axis).normalize();
      return { axis, start, speed: 0.18 + (i % 7) * 0.035, phase: i * 0.61, radius: 1.95 + (i % 3) * 0.12 };
    });
    const packetGeo = new THREE.BufferGeometry();
    const packetPos = new Float32Array(PACKETS * 3);
    packetGeo.setAttribute("position", new THREE.BufferAttribute(packetPos, 3));
    const packetMat = new THREE.PointsMaterial({ color: colors.packet, size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.75, depthWrite: false });
    const packets = new THREE.Points(packetGeo, packetMat);
    group.add(packets);

    group.rotation.set(0.35, -0.4, 0.08);

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();
    const draw = () => {
      const t = clock.getElapsedTime();
      pointMat.uniforms.uTime.value = t;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      group.rotation.y = -0.4 + t * 0.08 + pointer.x * 0.25;
      group.rotation.x = 0.35 + pointer.y * 0.15;
      core.rotation.set(t * 0.35, t * 0.5, 0);
      orbits.forEach((o, i) => {
        tmp.copy(o.start).applyAxisAngle(o.axis, o.phase + t * o.speed).multiplyScalar(o.radius);
        packetPos[i * 3] = tmp.x;
        packetPos[i * 3 + 1] = tmp.y;
        packetPos[i * 3 + 2] = tmp.z;
      });
      packetGeo.getAttribute("position").needsUpdate = true;
      renderer.render(scene, camera);
    };

    pulseRef.current = () => {
      const u = pointMat.uniforms;
      u.uPulseStart.value = clock.getElapsedTime();
      u.uPulseOrigin.value = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, 0.8).normalize();
      if (reduced) draw();
    };

    let raf = 0;
    let visible = true;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      draw();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(host);
    if (reduced) draw();
    else loop();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      pulseRef.current = null;
      [shell, pointGeo, edgeGeo, coreGeo, packetGeo].forEach((g) => g.dispose());
      [pointMat, edgeMat, coreMat, packetMat].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [variant]);

  React.useEffect(() => {
    if (pulseKey) pulseRef.current?.();
  }, [pulseKey]);

  return (
    <div ref={hostRef} aria-hidden="true" className={cn("relative h-full w-full", failed && "bg-dotgrid", className)} />
  );
}
