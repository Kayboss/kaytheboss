const canvas = document.getElementById("hero-3d");
const section = document.getElementById("hero-section");

if (canvas && section) {
  const gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    }) || canvas.getContext("experimental-webgl");

  if (!gl) {
    section.classList.add("hero-3d-failed");
  } else {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const vertex = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

    const fragment = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_fade;

#define MAX_STEPS 96
#define FAR_CLIP 14.0

mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float scene(vec3 p) {
  float t = u_time;
  float breathe = 1.0 + 0.03 * sin(t * 0.5);

  vec3 q = p / breathe;
  q.xz *= rot(t * 0.21);
  q.xy *= rot(0.45 + u_mouse.x * 0.45 + u_mouse.y * 0.15);
  float ringA = sdTorus(q, vec2(1.22, 0.30));

  vec3 r = p / breathe;
  r.xy *= rot(-t * 0.17 + 1.05);
  r.yz *= rot(0.95 + u_mouse.y * 0.35);
  float ringB = sdTorus(r, vec2(0.94, 0.19));

  float d = smin(ringA, ringB, 0.26);

  float ang = t * 0.55;
  vec3 bead = vec3(
    cos(ang) * 1.85,
    sin(ang * 0.8) * 0.45 + u_mouse.y * 0.55,
    sin(ang) * 1.85
  );
  d = smin(d, length(p - bead) - 0.21, 0.22);

  return d * breathe;
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.0016;
  return normalize(
    e.xyy * scene(p + e.xyy) +
    e.yyx * scene(p + e.yyx) +
    e.yxy * scene(p + e.yxy) +
    e.xxx * scene(p + e.xxx)
  );
}

float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0;
  float t = 0.05;
  for (int i = 0; i < 26; i++) {
    float h = scene(ro + rd * t);
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.02, 0.25);
    if (res < 0.005 || t > 6.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.02 + 0.14 * float(i);
    occ += (h - scene(p + n * h)) * sca;
    sca *= 0.72;
  }
  return clamp(1.0 - 1.7 * occ, 0.0, 1.0);
}

vec3 backdrop(vec2 uv) {
  float glow = exp(-length(uv - vec2(0.22, 0.05)) * 1.25);
  vec3 col = vec3(0.031, 0.031, 0.039);
  col += vec3(0.10, 0.075, 0.026) * glow * 0.85;
  return col;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag * 2.0 - u_res) / u_res.y;

  // Camera orbits the sculpture: the pointer drives yaw/pitch and the target
  // drifts, so moving across the hero produces real parallax rather than a
  // look-at nudge on a centred object.
  float yaw   = u_mouse.x * 0.85;
  float pitch = 0.22 + u_mouse.y * 0.45;
  float dist  = 4.35 - u_mouse.y * 0.25;

  vec3 ro = vec3(
    sin(yaw) * cos(pitch) * dist,
    sin(pitch) * dist,
    cos(yaw) * cos(pitch) * dist
  );
  vec3 ta = vec3(u_mouse.x * 0.10, 0.10 + u_mouse.y * 0.10, 0.0);

  vec3 fwd = normalize(ta - ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, right);
  vec3 rd = normalize(uv.x * right + uv.y * up + 1.75 * fwd);

  vec3 col = backdrop(uv);

  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = scene(p);
    if (d < 0.0008) { hit = true; break; }
    t += d * 0.85;
    if (t > FAR_CLIP) break;
  }

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);

    vec3 key  = normalize(vec3(0.62, 0.78, 0.42));
    vec3 fill = normalize(vec3(-0.75, 0.18, -0.55));

    float keyD  = max(dot(n, key), 0.0);
    float fillD = max(dot(n, fill), 0.0);
    float sh    = softShadow(p + n * 0.02, key);
    float ao    = ambientOcclusion(p, n);

    vec3 gold = vec3(0.965, 0.784, 0.259);
    vec3 deep = vec3(0.34, 0.23, 0.06);

    vec3 h = normalize(key - rd);
    float spec = pow(max(dot(n, h), 0.0), 64.0);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

    vec3 lit = mix(deep, gold, 0.35 + 0.65 * ao);
    col = lit * (0.16 + 0.90 * keyD * sh) * ao;
    col += gold * fillD * 0.20;
    col += vec3(1.0, 0.94, 0.82) * spec * sh * 0.95;
    col += gold * fres * 0.42;

    col = mix(backdrop(uv), col, clamp(t * 1.5, 0.0, 1.0));
  }

  col *= u_fade;
  col = col / (col + vec3(0.82)) * 1.28;
  col = pow(max(col, 0.0), vec3(0.4545));

  gl_FragColor = vec4(col, 1.0);
}
`;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);

    if (!vs || !fs) {
      section.classList.add("hero-3d-failed");
    } else {
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        section.classList.add("hero-3d-failed");
      } else {
        gl.useProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          gl.STATIC_DRAW
        );
        const aPos = gl.getAttribLocation(program, "a_pos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const uRes = gl.getUniformLocation(program, "u_res");
        const uTime = gl.getUniformLocation(program, "u_time");
        const uMouse = gl.getUniformLocation(program, "u_mouse");
        const uFade = gl.getUniformLocation(program, "u_fade");

        let quality = 0.7;
        let width = 0;
        let height = 0;

        const resize = () => {
          const rect = section.getBoundingClientRect();
          const w = Math.max(1, Math.round(rect.width * quality));
          const h = Math.max(1, Math.round(rect.height * quality));
          if (w === width && h === height) return;
          width = w;
          height = h;
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        };

        const smooth = { x: 0, y: 0 };
        const target = { x: 0, y: 0 };

        if (!reduced) {
          section.addEventListener(
            "pointermove",
            (e) => {
              const r = section.getBoundingClientRect();
              target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
              target.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
            },
            { passive: true }
          );

          section.addEventListener("pointerleave", () => {
            target.x = 0;
            target.y = 0;
          });
        }

        let visible = true;
        if (!reduced && "IntersectionObserver" in window) {
          new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
            },
            { threshold: 0.01 }
          ).observe(section);
        }

        let raf = 0;
        const start = performance.now();
        let last = start;
        let frameAvg = 16;
        let broken = false;
        let painted = false;

        const render = (now) => {
          resize();
          gl.uniform2f(uRes, width, height);
          gl.uniform1f(uTime, (now - start) / 1000);
          gl.uniform2f(uMouse, smooth.x, smooth.y);
          gl.uniform1f(uFade, reduced ? 1 : Math.min(1, (now - start) / 900));
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          if (!painted) {
            painted = true;
            section.classList.add("hero-3d-ready");
          }
        };

        if (reduced) {
          render(start);
        } else {
          const frame = (now) => {
            raf = requestAnimationFrame(frame);
            if (!visible || document.hidden || broken) return;

            smooth.x += (target.x - smooth.x) * 0.045;
            smooth.y += (target.y - smooth.y) * 0.045;

            render(now);

            frameAvg = frameAvg * 0.92 + (now - last) * 0.08;
            last = now;
            if (frameAvg > 26 && quality > 0.45) {
              quality = Math.max(0.45, quality - 0.1);
            } else if (frameAvg < 15 && quality < 0.7) {
              quality = Math.min(0.7, quality + 0.05);
            }
          };
          raf = requestAnimationFrame(frame);
        }

        canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          broken = true;
          cancelAnimationFrame(raf);
          section.classList.remove("hero-3d-ready");
          section.classList.add("hero-3d-failed");
        });

        addEventListener("resize", resize);
        resize();
      }
    }
  }
}
