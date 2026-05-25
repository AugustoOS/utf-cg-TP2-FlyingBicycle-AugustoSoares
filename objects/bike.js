const Bike = {
    bikeVAO: null,
    texture:  null,

    async init() {
        const gl = GLPanel.state.gl;

        try {
            this.texture = await GLPanel.loadTextureFromUrl('../assets/models/bicycle/bicycle_diffuse.png');
        } catch {
            this.texture = solidTex(gl, [190, 55, 45, 255]);
        }

        const g = await OBJLoader.load('../assets/models/bicycle/bicycle.obj');
        this.bikeVAO = GLPanel.createVAO(g.positions, g.normals, g.uvs);
    },

    draw(loc, bike) {
        if (!this.bikeVAO) return;

        // escala 3 = tamanho certo no mundo; + PI porque o modelo saiu de ré do Blender
        const model = Mat4.mult(
            Mat4.translate(bike.x, bike.y, bike.z),
            Mat4.mult(
                Mat4.rotateY(bike.angle + Math.PI),
                Mat4.scale(3, 3, 3)
            )
        );

        const gl = GLPanel.state.gl;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(loc.uTexture,     0);
        gl.uniform1i(loc.uUseLighting, 1);
        gl.uniform1i(loc.uNoFog,       0);

        const nm = new Float32Array([model[0],model[1],model[2], model[4],model[5],model[6], model[8],model[9],model[10]]);
        gl.uniformMatrix4fv(loc.uModel,        false, Mat4.asFloat32Array(model));
        gl.uniformMatrix3fv(loc.uNormalMatrix, false, nm);
        GLPanel.drawVAO(this.bikeVAO);
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