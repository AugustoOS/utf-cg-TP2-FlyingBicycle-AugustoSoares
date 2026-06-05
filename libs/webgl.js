window.GLPanel = window.GLPanel ? window.GLPanel : {};

GLPanel.state = {
    canvas: null,
    gl: null,
    program: null,
    locations: null,
    pixelRatio: 1,
    options: {
        shaderPaths: { 
            vertex: '',
            fragment: ''},
    },
};

GLPanel.loadShaderSource = async function loadShaderSource(path) {
    const response = await fetch(path);
    if (!response.ok) 
        throw new Error(`Could not fetch shader: ${path}`);
    
    return response.text();
};

GLPanel.createShader = function createShader(gl, type, source) {
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

GLPanel.createProgram = function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = GLPanel.createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = GLPanel.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader)   return null;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
};

GLPanel.resize = function resize() {
    const state = GLPanel.state;
    const pixelRatio = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(state.canvas.clientWidth * pixelRatio);
    const displayHeight = Math.floor(state.canvas.clientHeight * pixelRatio);

    if (state.canvas.width !== displayWidth || state.canvas.height !== displayHeight) {
        state.canvas.width = displayWidth;
        state.canvas.height = displayHeight;
    }

    state.pixelRatio = pixelRatio;
    state.gl.viewport(0, 0, state.canvas.width, state.canvas.height);
};

GLPanel.init = async function init(canvasElement, options) {
    if (GLPanel.state.gl) return GLPanel.state.gl;

    const canvas = canvasElement || document.querySelector('.canvas');
    if (!canvas) return null;

    const mergedOptions = {
        shaderPaths: {
            vertex: (options?.shaderPaths?.vertex) || '',
            fragment: (options?.shaderPaths?.fragment) || '',
        },
    };

    if (!mergedOptions.shaderPaths.vertex || !mergedOptions.shaderPaths.fragment) {
        console.error('GLPanel.init requires shaderPaths.vertex and shaderPaths.fragment.');
        return null;
    }

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error('WebGL2 is not available in this browser.');
        return null;
    }

    let vertexSource, fragmentSource;
    try {
        [vertexSource, fragmentSource] = await Promise.all([
            GLPanel.loadShaderSource(mergedOptions.shaderPaths.vertex),
            GLPanel.loadShaderSource(mergedOptions.shaderPaths.fragment),
        ]);
    } catch (error) {
        console.error(error);
        return null;
    }

    const program = GLPanel.createProgram(gl, vertexSource, fragmentSource);
    if (!program) return null;

    GLPanel.state = {
        canvas,
        gl,
        program,
        pixelRatio: 1,
        options: mergedOptions,
        locations: {
            aPosition:     gl.getAttribLocation(program,  'a_position'),
            aNormal:       gl.getAttribLocation(program,  'a_normal'),
            aUv:           gl.getAttribLocation(program,  'a_uv'),
            uModel:        gl.getUniformLocation(program, 'u_model'),
            uVP:           gl.getUniformLocation(program, 'u_vp'),
            uNormalMatrix: gl.getUniformLocation(program, 'u_normalMatrix'),
            uLightPos:     gl.getUniformLocation(program, 'u_lightPos'),
            uLightColor:   gl.getUniformLocation(program, 'u_lightColor'),
            uViewPos:      gl.getUniformLocation(program, 'u_viewPos'),
            uUseLighting:  gl.getUniformLocation(program, 'u_useLighting'),
            uAmbient:      gl.getUniformLocation(program, 'u_ambient'),
            uDiffuse:      gl.getUniformLocation(program, 'u_diffuse'),
            uShininess:    gl.getUniformLocation(program, 'u_shininess'),
            uSpecular:     gl.getUniformLocation(program, 'u_specular'),
            uTexture:      gl.getUniformLocation(program, 'u_texture'),
            uFogColor:     gl.getUniformLocation(program, 'u_fogColor'),
            uFogDensity:   gl.getUniformLocation(program, 'u_fogDensity'),
            uBikePos:      gl.getUniformLocation(program, 'u_bikePos'),
            uNoFog:        gl.getUniformLocation(program, 'u_noFog'),
        },
    };

    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 1);

    GLPanel.resize();
    window.addEventListener('resize', GLPanel.resize);
    return gl;
};

GLPanel.loadTextureFromUrl = function loadTextureFromUrl(url) {
    const state = GLPanel.state;
    if (!state.gl) return Promise.reject(new Error('GLPanel must be initialized before loading textures.'));

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const texture = state.gl.createTexture();
            state.gl.bindTexture(state.gl.TEXTURE_2D, texture);
            state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_WRAP_S, state.gl.REPEAT);
            state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_WRAP_T, state.gl.REPEAT);
            state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_MIN_FILTER, state.gl.LINEAR_MIPMAP_LINEAR);
            state.gl.texParameteri(state.gl.TEXTURE_2D, state.gl.TEXTURE_MAG_FILTER, state.gl.LINEAR);
            state.gl.texImage2D(state.gl.TEXTURE_2D, 0, state.gl.RGBA, state.gl.RGBA, state.gl.UNSIGNED_BYTE, image);
            state.gl.generateMipmap(state.gl.TEXTURE_2D);
            resolve(texture);
        };
        image.onerror = () => reject(new Error(`Could not load texture: ${url}`));
        image.src = url;
    });
};

GLPanel.beginFrame = function beginFrame() {
    const state = GLPanel.state;
    if (!state.gl) return;
    GLPanel.resize();
    state.gl.clear(state.gl.COLOR_BUFFER_BIT | state.gl.DEPTH_BUFFER_BIT);
};

GLPanel.createVAO = function createVAO(positions, normals, uvs, indices) {
    const gl  = GLPanel.state.gl;
    const loc = GLPanel.state.locations;

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc.aPosition);
    gl.vertexAttribPointer(loc.aPosition, 3, gl.FLOAT, false, 0, 0);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc.aNormal);
    gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc.aUv);
    gl.vertexAttribPointer(loc.aUv, 2, gl.FLOAT, false, 0, 0);

    let indexBuffer = null;
    let indexCount  = 0;
    if (indices) {
        indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        indexCount = indices.length;
    }

    gl.bindVertexArray(null);

    return { vao, indexBuffer, indexCount, vertexCount: positions.length / 3 };
};

GLPanel.drawVAO = function drawVAO(vaoInfo) {
    const gl = GLPanel.state.gl;
    gl.bindVertexArray(vaoInfo.vao);
    if (vaoInfo.indexBuffer) {
        gl.drawElements(gl.TRIANGLES, vaoInfo.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, vaoInfo.vertexCount);
    }
    gl.bindVertexArray(null);
};