const Bike = {
    bodyVAO:   null,
    wheelFVAO: null,  // Bicycle.001 — roda frente
    wheelRVAO: null,  // Bicycle.002 — roda trás
    pedalVAO:  null,  // Bicycle.003 — eixo dos pedais
    wheelFC: null, wheelRC: null, pedalC: null,
    texture:    null,
    spinAngle:  0,
    pedalAngle: 0,

    async init() {
        const gl = GLPanel.state.gl;
        try {
            this.texture = await GLPanel.loadTextureFromUrl('../assets/models/bicycle/bicycle_diffuse.png');
        } catch {
            this.texture = solidTex(gl, [190, 55, 45, 255]);
        }

        const groups = await OBJLoader.loadGroups('../assets/models/bicycle/bicycle.obj');

        const body = groups.get('Bicycle');
        if (body) this.bodyVAO = GLPanel.createVAO(body.positions, body.normals, body.uvs);

        const parts = [
            ['Bicycle.001', 'wheelFVAO', 'wheelFC'],
            ['Bicycle.002', 'wheelRVAO', 'wheelRC'],
            ['Bicycle.003', 'pedalVAO',  'pedalC' ],
        ];
        for (const [name, vaoKey, cKey] of parts) {
            const g = groups.get(name);
            if (!g) continue;
            this[vaoKey] = GLPanel.createVAO(g.positions, g.normals, g.uvs);
            this[cKey]   = this._center(g.positions);
        }
    },

    _center(pos) {
        let mnX= Infinity, mnY= Infinity, mnZ= Infinity;
        let mxX=-Infinity, mxY=-Infinity, mxZ=-Infinity;
        for (let i = 0; i < pos.length; i += 3) {
            if (pos[i]   < mnX) mnX = pos[i];   if (pos[i]   > mxX) mxX = pos[i];
            if (pos[i+1] < mnY) mnY = pos[i+1]; if (pos[i+1] > mxY) mxY = pos[i+1];
            if (pos[i+2] < mnZ) mnZ = pos[i+2]; if (pos[i+2] > mxZ) mxZ = pos[i+2];
        }
        return [(mnX+mxX)/2, (mnY+mxY)/2, (mnZ+mxZ)/2];
    },

    draw(loc, bike) {
        if (!this.bodyVAO) return;

        const gl = GLPanel.state.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(loc.uTexture,     0);
        gl.uniform1i(loc.uUseLighting, 1);
        gl.uniform1i(loc.uNoFog,       0);

        const base = Mat4.mult(
            Mat4.translate(bike.x, bike.y, bike.z),
            Mat4.mult(Mat4.rotateY(bike.angle + Math.PI), Mat4.scale(3, 3, 3))
        );

        this.spinAngle   = (this.spinAngle  + 0.18) % (Math.PI * 2);
        this.pedalAngle  = (this.pedalAngle + 0.05) % (Math.PI * 2);

        this._draw(loc, base, this.bodyVAO);

        for (const [vao, c, angle] of [
            [this.wheelFVAO, this.wheelFC, -this.spinAngle ],
            [this.wheelRVAO, this.wheelRC, -this.spinAngle ],
            [this.pedalVAO,  this.pedalC,   this.pedalAngle],
        ]) {
            if (!vao || !c) continue;
            const [cx, cy, cz] = c;
            const spin = Mat4.mult(
                Mat4.mult(Mat4.translate(cx, cy, cz), Mat4.rotateX(angle)),
                Mat4.translate(-cx, -cy, -cz)
            );
            this._draw(loc, Mat4.mult(base, spin), vao);
        }
    },

    _draw(loc, model, vao) {
        const gl = GLPanel.state.gl;
        gl.uniformMatrix4fv(loc.uModel,        false, Mat4.asFloat32Array(model));
        gl.uniformMatrix3fv(loc.uNormalMatrix, false, Mat4.normalMat(model));
        GLPanel.drawVAO(vao);
    },
};

function solidTex(gl, rgba) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
}

window.Bike = Bike;