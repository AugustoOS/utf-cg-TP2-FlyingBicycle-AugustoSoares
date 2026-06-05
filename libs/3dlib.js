// ============================================================
// lib 3D para WebGL - Matematica de vetores e matrizes
// Vec4 = [x, y, z, w]
// Mat4 = array com 16 elementos em column-major
// ============================================================

const Vec4 = {
	create(x = 0, y = 0, z = 0, w = 1) {
		return [x, y, z, w];
	},

	// Multiplicacao por escalar
	scale(v, k) {
		return [v[0] * k, v[1] * k, v[2] * k, v[3] * k];
	},

	// Soma de dois vetores
	add(a, b) {
		return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
	},

	// Vetor a partir de dois pontos: p2 - p1
	fromPoints(p1, p2) {
		return [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2], 0];
	},

	// Norma (somente parte 3D)
	norm(v) {
		return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	},	

	// Normalizacao
	normalize(v) {
		const n = Vec4.norm(v);
		if (n === 0) return [0, 0, 0, v[3]];
		return [v[0] / n, v[1] / n, v[2] / n, v[3]];
	},

	// Produto vetorial (3D)
	cross(a, b) {
		return [
			a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0],
			0
		];
	},

	// Produto escalar (dot)
	dot(a, b) {
		return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	},

	// Menor angulo entre dois vetores (radianos)
	angleBetween(a, b) {
		const na = Vec4.norm(a);
		const nb = Vec4.norm(b);
		if (na === 0 || nb === 0) return 0;

		let c = Vec4.dot(a, b) / (na * nb);
		c = Math.max(-1, Math.min(1, c));
		return Math.acos(c);
	},

	// Combinacao afim de dois pontos: (1-t)p + tq
	affineCombination(p, q, t) {
		return [
			(1 - t) * p[0] + t * q[0],
			(1 - t) * p[1] + t * q[1],
			(1 - t) * p[2] + t * q[2],
			(1 - t) * p[3] + t * q[3]
		];
	}
};


const Mat4 = {
	identity() {
		return [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
	},

	translate(tx, ty, tz) {
		return [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			tx, ty, tz, 1
		];
	},

	rotateX(alpha) {
		const c = Math.cos(alpha);
		const s = Math.sin(alpha);
		return [
			1, 0, 0, 0,
			0, c, s, 0,
			0, -s, c, 0,
			0, 0, 0, 1
		];
	},

    rotateY(alpha) {
		const c = Math.cos(alpha);
		const s = Math.sin(alpha);
		return [
			c, 0, -s, 0,
			0, 1, 0, 0,
			s, 0, c, 0,
			0, 0, 0, 1
		];
	},

	rotateZ(alpha) {
		const c = Math.cos(alpha);
		const s = Math.sin(alpha);
		return [
			c, s, 0, 0,
			-s, c, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
	},

	scale(sx, sy, sz) {
		return [
			sx, 0, 0, 0,
			0, sy, 0, 0,
			0, 0, sz, 0,
			0, 0, 0, 1
		];
	},

	// C = A * B (column-major)
	mult(A, B) {
		const C = new Array(16).fill(0);
		const idx = (row, col) => col * 4 + row;

		for (let row = 0; row < 4; row++) {
			for (let col = 0; col < 4; col++) {
				let sum = 0;
				for (let k = 0; k < 4; k++) {
					sum += A[idx(row, k)] * B[idx(k, col)];
				}
				C[idx(row, col)] = sum;
			}
		}

		return C;
	},

	ortho(l, r, b, t, n, f) {
		return [
			2 / (r - l), 0, 0, 0,
			0, 2 / (t - b), 0, 0,
			0, 0, -2 / (f - n), 0,
			-(r + l) / (r - l),
			-(t + b) / (t - b),
			-(f + n) / (f - n),
			1
		];
	},

	perspective(fovY, aspect, n, f) {
		const cot = 1 / Math.tan(fovY / 2);
		return [
			cot / aspect, 0, 0, 0,
			0, cot, 0, 0,
			0, 0, (f + n) / (n - f), -1,
			0, 0, (2 * f * n) / (n - f), 0
		];
	},

	lookAt(eye, center, up) {
		const f = Vec4.normalize(Vec4.fromPoints(eye, center));
		const s = Vec4.normalize(Vec4.cross(f, up));
		const u = Vec4.cross(s, f);

		return [
			 s[0],  u[0], -f[0], 0,
			 s[1],  u[1], -f[1], 0,
			 s[2],  u[2], -f[2], 0,
			-Vec4.dot(s, eye), -Vec4.dot(u, eye), Vec4.dot(f, eye), 1
		];
	},

	asFloat32Array(M) {
		return new Float32Array(M);
	},

	// vi essa implementaçao e achei util para meu caso:
	normalMat(m) {
		const s   = Math.sqrt(m[0]*m[0] + m[1]*m[1] + m[2]*m[2]);
		const inv = 1 / s;
		return new Float32Array([
			m[0]*inv, m[1]*inv, m[2]*inv,
			m[4]*inv, m[5]*inv, m[6]*inv,
			m[8]*inv, m[9]*inv, m[10]*inv,
		]);
	},
};


window.Vec4 = Vec4;
window.Mat4 = Mat4;

