const Trees = {
    vaoInfo:  null,
    texture:  null,
    chunks:   new Map(),

    SCALE:    1.0,
    PER_CHUNK: 6,   // árvores por chunk

    async init() {
        const geo = await OBJLoader.load('../assets/models/tree/Tree2.obj');
        this.vaoInfo = GLPanel.createVAO(geo.positions, geo.normals, geo.uvs);

        const gl = GLPanel.state.gl;
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([30, 90, 20, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    },

    // hash determinístico: dado o mesmo chunk e índice, sempre retorna o mesmo valor [0, 1)
    _rand(cx, cz, i) {
        return Math.abs(Math.sin(cx * 127.1 + cz * 311.7 + i * 74.3) * 43758.5453) % 1;
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
                scale: this.SCALE * (0.85 + this._rand(cx, cz, i*4+3) * 0.3),
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
        gl.uniform1i(loc.uTexture,  0);
        gl.uniform1f(loc.uSpecular, 0.0);  // folhas são foscas

        for (const key of needed) {
            const [cx, cz] = key.split(',').map(Number);
            for (const t of this._getChunk(cx, cz)) {
                const model = Mat4.mult(
                    Mat4.mult(Mat4.translate(t.wx, t.wy, t.wz), Mat4.rotateY(t.rot)),
                    Mat4.scale(t.scale, t.scale, t.scale)
                );
                gl.uniformMatrix4fv(loc.uModel,        false, Mat4.asFloat32Array(model));
                gl.uniformMatrix3fv(loc.uNormalMatrix, false, Mat4.normalMat(model));
                GLPanel.drawVAO(this.vaoInfo);
            }
        }

        gl.uniform1f(loc.uSpecular, 1.0);
    },
};

window.Trees = Trees;