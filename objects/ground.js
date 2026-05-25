const Ground = {
    chunks:  new Map(),
    texture: null,

    CHUNK: 50,   // tamanho do chunk em unidades
    DIVS:  20,   // subdivisões por chunk (20x20 quads)
    RAIO:  3,    // chunks visíveis em cada direção (7x7 = 49 chunks)

    // soma de 3 ondas senoidais — dá relevo suave e contínuo ao terreno
    _altura(x, z) {
        return 2.5 * Math.sin(x * 0.040 + 1.20) * Math.sin(z * 0.050 + 0.80)
             + 1.2 * Math.sin(x * 0.090 + 2.30) * Math.sin(z * 0.110 + 1.70)
             + 0.6 * Math.sin(x * 0.170 + 0.50) * Math.sin(z * 0.150 + 3.20);
    },

    // gradiente analítico da função de altura — normal exata sem custo de cross product
    _normal(x, z) {
        const dhdx = 2.5*0.040 * Math.cos(x*0.040+1.20) * Math.sin(z*0.050+0.80)
                   + 1.2*0.090 * Math.cos(x*0.090+2.30) * Math.sin(z*0.110+1.70)
                   + 0.6*0.170 * Math.cos(x*0.170+0.50) * Math.sin(z*0.150+3.20);
        const dhdz = 2.5*0.050 * Math.sin(x*0.040+1.20) * Math.cos(z*0.050+0.80)
                   + 1.2*0.110 * Math.sin(x*0.090+2.30) * Math.cos(z*0.110+1.70)
                   + 0.6*0.150 * Math.sin(x*0.170+0.50) * Math.cos(z*0.150+3.20);
        const len = Math.sqrt(dhdx*dhdx + 1 + dhdz*dhdz);
        return [-dhdx/len, 1/len, -dhdz/len];
    },

    init() {
        const gl = GLPanel.state.gl;
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([34, 120, 34, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    },

    _buildChunk(cx, cz) {
        const cs   = this.CHUNK;
        const divs = this.DIVS;
        const step = cs / divs;
        const uvT  = 6;  // tiling de textura por chunk
        const ox   = cx * cs, oz = cz * cs;  // offset mundial do chunk

        const positions = [], normals = [], uvs = [];

        for (let i = 0; i < divs; i++) {
            for (let j = 0; j < divs; j++) {
                const lx0 = i * step,      lx1 = lx0 + step;
                const lz0 = j * step,      lz1 = lz0 + step;
                const wx0 = ox + lx0, wx1 = ox + lx1;
                const wz0 = oz + lz0, wz1 = oz + lz1;
                const u0 = (i / divs) * uvT, u1 = ((i+1) / divs) * uvT;
                const v0 = (j / divs) * uvT, v1 = ((j+1) / divs) * uvT;

                const h00 = this._altura(wx0, wz0), n00 = this._normal(wx0, wz0);
                const h10 = this._altura(wx1, wz0), n10 = this._normal(wx1, wz0);
                const h01 = this._altura(wx0, wz1), n01 = this._normal(wx0, wz1);
                const h11 = this._altura(wx1, wz1), n11 = this._normal(wx1, wz1);

                // vértices em coordenadas locais do chunk (X/Z), altura em coordenadas mundiais
                positions.push(lx0,h00,lz0,  lx1,h10,lz0,  lx0,h01,lz1);
                normals.push  (...n00,         ...n10,         ...n01);
                uvs.push      (u0,v0,          u1,v0,          u0,v1);

                positions.push(lx1,h10,lz0,  lx1,h11,lz1,  lx0,h01,lz1);
                normals.push  (...n10,         ...n11,         ...n01);
                uvs.push      (u1,v0,          u1,v1,          u0,v1);
            }
        }

        return GLPanel.createVAO(positions, normals, uvs);
    },

    draw(loc, bx, bz) {
        const cs  = this.CHUNK;
        const pcx = Math.floor(bx / cs);
        const pcz = Math.floor(bz / cs);
        const r   = this.RAIO;

        // determina chunks necessários
        const needed = new Set();
        for (let dx = -r; dx <= r; dx++)
            for (let dz = -r; dz <= r; dz++)
                needed.add(`${pcx+dx},${pcz+dz}`);

        // remove chunks fora do alcance
        for (const key of [...this.chunks.keys()])
            if (!needed.has(key)) this.chunks.delete(key);

        // gera chunks que ainda não existem
        for (const key of needed)
            if (!this.chunks.has(key)) {
                const [cx, cz] = key.split(',').map(Number);
                this.chunks.set(key, this._buildChunk(cx, cz));
            }

        const gl           = GLPanel.state.gl;
        const identNormal  = new Float32Array([1,0,0, 0,1,0, 0,0,1]);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(loc.uTexture,  0);
        gl.uniform1f(loc.uSpecular, 0.0);  // grama é fosca, sem reflexo especular

        for (const key of needed) {
            const [cx, cz] = key.split(',').map(Number);
            // translate para posicionar o chunk no mundo (somente X e Z)
            gl.uniformMatrix4fv(loc.uModel, false, Mat4.asFloat32Array(Mat4.translate(cx * cs, 0, cz * cs)));
            gl.uniformMatrix3fv(loc.uNormalMatrix, false, identNormal);
            GLPanel.drawVAO(this.chunks.get(key));
        }
    },
};

window.Ground = Ground;