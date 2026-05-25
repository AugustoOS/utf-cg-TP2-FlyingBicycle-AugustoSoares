const Bushs = {
    vaoInfo:   null,
    texture:   null,
    chunks:    new Map(),

    SCALE:     0.5,
    PER_CHUNK: 8,   // arbustos por chunk

    async init() {
        const geo = await OBJLoader.load('../assets/models/bush/Bush1.obj');
        this.vaoInfo = GLPanel.createVAO(geo.positions, geo.normals, geo.uvs);

        const gl = GLPanel.state.gl;
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([40, 110, 30, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    },

    // hash determinístico: dado o mesmo chunk e índice, sempre retorna o mesmo valor [0, 1)
    _rand(cx, cz, i) {
        return Math.abs(Math.sin(cx * 211.3 + cz * 439.7 + i * 113.1) * 43758.5453) % 1;
    },

    _getChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (this.chunks.has(key)) return this.chunks.get(key);

        const cs   = Ground.CHUNK;
        const inst = [];
        for (let i = 0; i < this.PER_CHUNK; i++) {
            const lx = this._rand(cx, cz, i*4)   * cs;
            const lz = this._rand(cx, cz, i*4+1) * cs;
            const wx = cx * cs + lx, wz = cz * cs + lz;
            inst.push({
                wx, wy: Ground._altura(wx, wz), wz,
                rot:   this._rand(cx, cz, i*4+2) * Math.PI * 2,
                scale: this.SCALE * (0.8 + this._rand(cx, cz, i*4+3) * 0.4),
            });
        }
        this.chunks.set(key, inst);
        return inst;
    },

    draw(loc, bx, bz) {
        if (!this.vaoInfo) return;
        const cs  = Ground.CHUNK;
        const pcx = Math.floor(bx / cs), pcz = Math.floor(bz / cs);
        const r   = Ground.RAIO;

        const needed = new Set();
        for (let dx = -r; dx <= r; dx++)
            for (let dz = -r; dz <= r; dz++)
                needed.add(`${pcx+dx},${pcz+dz}`);

        for (const key of [...this.chunks.keys()])
            if (!needed.has(key)) this.chunks.delete(key);

        const gl = GLPanel.state.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(loc.uTexture, 0);

        for (const key of needed) {
            const [cx, cz] = key.split(',').map(Number);
            for (const t of this._getChunk(cx, cz)) {
                const model = Mat4.mult(
                    Mat4.mult(Mat4.translate(t.wx, t.wy, t.wz), Mat4.rotateY(t.rot)),
                    Mat4.scale(t.scale, t.scale, t.scale)
                );
                gl.uniformMatrix4fv(loc.uModel,        false, Mat4.asFloat32Array(model));
                gl.uniformMatrix3fv(loc.uNormalMatrix, false, Bushs._normalMat(model));
                GLPanel.drawVAO(this.vaoInfo);
            }
        }
    },

    // extrai a rotação da matrix model (divide pela escala — comprimento da primeira coluna)
    _normalMat(m) {
        const escala    = Math.sqrt(m[0]*m[0] + m[1]*m[1] + m[2]*m[2]);
        const invEscala = 1 / escala;
        return new Float32Array([
            m[0]*invEscala, m[1]*invEscala, m[2]*invEscala,
            m[4]*invEscala, m[5]*invEscala, m[6]*invEscala,
            m[8]*invEscala, m[9]*invEscala, m[10]*invEscala,
        ]);
    },
};

window.Bushs = Bushs;