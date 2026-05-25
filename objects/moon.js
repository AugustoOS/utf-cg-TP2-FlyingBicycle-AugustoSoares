const Moon = {
    vaoInfo: null,
    texture: null,

    init() {
        const latSegs = 20;
        const lonSegs = 20;
        const positions = [], normals = [], uvs = [];

        for (let i = 0; i < latSegs; i++) {
            for (let j = 0; j < lonSegs; j++) {
                const theta0 = (i / latSegs) * Math.PI;          // ângulo de latitude (0 a PI)
                const theta1 = ((i + 1) / latSegs) * Math.PI;
                const phi0   = (j / lonSegs) * 2 * Math.PI;      // ângulo de longitude (0 a 2PI)
                const phi1   = ((j + 1) / lonSegs) * 2 * Math.PI;

                // vértice na superfície da esfera unitária (coordenadas esféricas → cartesianas)
                const vert = (theta, phi) => [
                    Math.sin(theta) * Math.cos(phi),
                    Math.cos(theta),
                    Math.sin(theta) * Math.sin(phi),
                ];
                const uvOf = (theta, phi) => [phi / (2 * Math.PI), theta / Math.PI];

                const vs = [vert(theta0,phi0), vert(theta1,phi0), vert(theta0,phi1),
                            vert(theta0,phi1), vert(theta1,phi0), vert(theta1,phi1)];
                const us = [uvOf(theta0,phi0), uvOf(theta1,phi0), uvOf(theta0,phi1),
                            uvOf(theta0,phi1), uvOf(theta1,phi0), uvOf(theta1,phi1)];

                for (let k = 0; k < 6; k++) {
                    positions.push(...vs[k]);
                    normals.push(...vs[k]);  // normal = posição na esfera unitária
                    uvs.push(...us[k]);
                }
            }
        }

        this.vaoInfo = GLPanel.createVAO(positions, normals, uvs);

        // textura amarelo-claro da lua
        const gl = GLPanel.state.gl;
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([255, 245, 200, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    },

    draw(loc, eye) {
        const gl = GLPanel.state.gl;

        // lua sempre 300 unidades na direção [0, 0.6, -0.8] a partir da câmera — inalcançável
        const d = 300;
        const model = Mat4.mult(
            Mat4.translate(eye[0], eye[1] + 0.6 * d, eye[2] - 0.8 * d),
            Mat4.scale(15, 15, 15)
        );

        gl.uniformMatrix4fv(loc.uModel,        false, Mat4.asFloat32Array(model));
        gl.uniformMatrix3fv(loc.uNormalMatrix, false, new Float32Array([1,0,0, 0,1,0, 0,0,1]));

        // lua ignora fog e iluminação — sempre visível no céu
        gl.uniform1i(loc.uUseLighting, 0);
        gl.uniform1i(loc.uNoFog, 1);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(loc.uTexture, 0);

        GLPanel.drawVAO(this.vaoInfo);
    },
};

window.Moon = Moon;