const state = {
    bike: { x: 0, y: 20, z: 0, angle: 0, turnVel: 0 },
    keys: {},
    touch: { left: false, right: false, up: false, down: false },
    camera: {
        active: 1,
        side:   0,
        orbit:  { yaw: 0, pitch: 0.3 },
        zoom:   14,
    },
    useLighting: true,
};

const Y_MIN      = 15;    // altura mínima de voo
const Y_MAX      = 80;    // altura máxima de voo
const SPEED      = 0.2;   // velocidade de avanço
const TURN_ACCEL = 0.0005; // aceleração da curva
const TURN_MAX   = 0.010;  // velocidade máxima de curva
const TURN_DECAY = 0.6;    // desacelera ao soltar a tecla

const COR_CEU = [0.02, 0.03, 0.12]; // cor do céu noturno (usada no fundo e no fog)

function initAudio() {
    const theme = new Audio('../sounds/flying_theme.mp4');
    const noise = new Audio('../sounds/brown_noise.mp4');

    theme.loop   = true;
    theme.volume = 0.75;
    noise.loop   = true;
    noise.volume = 0.25;

    let started = false;
    const start = () => {
        if (started) return;
        started = true;
        theme.play().catch(() => {});
        noise.play().catch(() => {});
    };
    window.addEventListener('keydown',    start, { once: false });
    window.addEventListener('mousedown',  start, { once: false });
    window.addEventListener('touchstart', start, { once: false });

    // botão mute
    const btn  = document.getElementById('btnMute');
    const icon = document.getElementById('muteIcon');
    if (btn) {
        btn.addEventListener('click', () => {
            start();
            const muted = !theme.muted;
            theme.muted = muted;
            noise.muted = muted;
            icon.src = muted
                ? '../assets/icons/mute.png'
                : '../assets/icons/unmute.png';
        });
    }
}

async function main() {
    const canvas = document.querySelector('.canvas');
    const gl = await GLPanel.init(canvas, {
        shaderPaths: {
            vertex:   '../shaders/vs.glsl',
            fragment: '../shaders/fs.glsl',
        },
    });
    if (!gl) return;

    gl.clearColor(...COR_CEU, 1);
    initAudio();

    Ground.init();
    Moon.init();
    // allSettled: mesmo que algum .obj falhe (GitHub Pages, 404, etc.), o loop inicia
    await Promise.allSettled([Trees.init(), Bushs.init(), Rocks.init(), Bike.init()]);

    window.addEventListener('keydown', e => {
        state.keys[e.code] = true;
        if (e.code === 'Digit1') state.camera.active = 1;
        if (e.code === 'Digit2') state.camera.active = 2;
        if (e.code === 'KeyC')   state.camera.side = (state.camera.side + 1) % 4;
        if (e.code === 'KeyL')   state.useLighting = !state.useLighting;
    });
    window.addEventListener('keyup', e => { state.keys[e.code] = false; });

    let dragging      = false;
    let lastMouse     = { x: 0, y: 0 };
    let lastPinchDist = null;

    // mouse (desktop)
    canvas.addEventListener('mousedown', e => { dragging = true; lastMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup',   () => { dragging = false; });
    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        state.camera.orbit.yaw   -= dx * 0.005;
        state.camera.orbit.pitch += dy * 0.005;
        // trava pra câmera não virar de cabeça pra baixo
        if (state.camera.orbit.pitch >  1.5) state.camera.orbit.pitch =  1.5;
        if (state.camera.orbit.pitch < -1.5) state.camera.orbit.pitch = -1.5;
        lastMouse = { x: e.clientX, y: e.clientY };
    });

    // scroll = zoom in/out (desktop)
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        state.camera.zoom = Math.max(4, Math.min(50, state.camera.zoom + e.deltaY * 0.03));
    }, { passive: false });

    // toque (mobile): 1 dedo = orbitar, 2 dedos = zoom
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        dragging  = true;
        lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastPinchDist = null;
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        if (e.touches.length === 0) { dragging = false; lastPinchDist = null; }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && dragging) {
            const dx = e.touches[0].clientX - lastMouse.x;
            const dy = e.touches[0].clientY - lastMouse.y;
            state.camera.orbit.yaw   -= dx * 0.005;
            state.camera.orbit.pitch += dy * 0.005;
            if (state.camera.orbit.pitch >  1.5) state.camera.orbit.pitch =  1.5;
            if (state.camera.orbit.pitch < -1.5) state.camera.orbit.pitch = -1.5;
            lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (lastPinchDist !== null) {
                const delta = lastPinchDist - dist;
                state.camera.zoom = Math.max(4, Math.min(50, state.camera.zoom + delta * 0.05));
            }
            lastPinchDist = dist;
        }
    }, { passive: false });

    // botões de direção para mobile
    function setupMobileBtn(id, key) {
        const btn = document.getElementById(id);
        if (!btn) return;
        const press   = e => { e.preventDefault(); e.stopPropagation(); state.touch[key] = true; };
        const release = e => { e.preventDefault(); state.touch[key] = false; };
        btn.addEventListener('touchstart',  press,   { passive: false });
        btn.addEventListener('touchend',    release, { passive: false });
        btn.addEventListener('touchcancel', release, { passive: false });
    }
    setupMobileBtn('btnUp',    'up');
    setupMobileBtn('btnDown',  'down');
    setupMobileBtn('btnLeft',  'left');
    setupMobileBtn('btnRight', 'right');

    requestAnimationFrame(loop);
}

function update() {
    const k = state.keys;
    const b = state.bike;

    const goLeft  = k['ArrowLeft'] || k['KeyA'] || state.touch.left;
    const goRight = k['ArrowRight'] || k['KeyD'] || state.touch.right;

    if (goLeft && goRight) {
        // A + D ao mesmo tempo: se anulam
        b.turnVel *= TURN_DECAY;
    } else if (goLeft) {
        b.turnVel = Math.min(b.turnVel + TURN_ACCEL, TURN_MAX);
    } else if (goRight) {
        b.turnVel = Math.max(b.turnVel - TURN_ACCEL, -TURN_MAX);
    } else {
        // soltar reseta rapidamente
        b.turnVel *= TURN_DECAY;
    }

    b.angle += b.turnVel;

    // câmera rotaciona junto com a curva (yaw acompanha o ângulo da bike)
    state.camera.orbit.yaw += b.turnVel;

    // altura com limite
    if (k['ArrowUp']   || k['KeyW'] || state.touch.up)   b.y = Math.min(b.y + 0.15, Y_MAX);
    if (k['ArrowDown'] || k['KeyS'] || state.touch.down) b.y = Math.max(b.y - 0.15, Y_MIN);

    // avança automaticamente
    b.x -= Math.sin(b.angle) * SPEED;
    b.z -= Math.cos(b.angle) * SPEED;

    // evita que a câmera mergulhe abaixo da grama
    if (state.camera.active === 1) {
        const { yaw, pitch } = state.camera.orbit;
        const D    = state.camera.zoom;
        const sinP = Math.sin(pitch);
        const cosP = Math.cos(pitch);
        const eyeX = b.x + D * cosP * Math.sin(yaw);
        const eyeZ = b.z + D * cosP * Math.cos(yaw);
        const eyeY = b.y + D * sinP;
        const chao = Ground._altura(eyeX, eyeZ) + 1.5;  // 1.5 unidades de margem
        if (eyeY < chao) {
            if (sinP < -0.001) {
                // reduz o zoom até o eye ficar acima do chão
                const zoomIdeal = (b.y - chao) / (-sinP);
                if (zoomIdeal >= 4) {
                    state.camera.zoom = zoomIdeal;
                } else {
                    // mesmo zoom mínimo não é suficiente: eleva o pitch para não cavar
                    state.camera.zoom = 4;
                    state.camera.orbit.pitch = -Math.asin((b.y - chao) / 4);
                }
            }
        }
    }
}

function loop(time) {
    const gl  = GLPanel.state.gl;
    const loc = GLPanel.state.locations;

    update();
    GLPanel.beginFrame();

    const aspect     = gl.canvas.width / gl.canvas.height;
    const projection = Mat4.perspective(Math.PI / 3, aspect, 0.1, 1000);
    const view       = Camera.getView(state);
    const eye        = Camera.getEye(state);

    gl.uniformMatrix4fv(loc.uProjection, false, Mat4.asFloat32Array(projection));
    gl.uniformMatrix4fv(loc.uView,       false, Mat4.asFloat32Array(view));
    // iluminação
    gl.uniform3fv(loc.uLightPos,   [0, 300, 0]);
    gl.uniform3fv(loc.uLightColor, [0.7, 0.8, 1]);
    gl.uniform3fv(loc.uViewPos,    eye);
    gl.uniform1f(loc.uAmbient,     0.2);
    gl.uniform1f(loc.uDiffuse,     1.0);  // cada objeto pode sobrescrever (grama = 0.4)
    gl.uniform1f(loc.uShininess,   32);
    gl.uniform1f(loc.uSpecular,    1.0);  // cada objeto pode sobrescrever (grama = 0)
    gl.uniform1i(loc.uUseLighting, state.useLighting ? 1 : 0);

    // névoa
    gl.uniform3fv(loc.uFogColor,  COR_CEU);
    gl.uniform1f(loc.uFogDensity, 0.01);
    gl.uniform3fv(loc.uBikePos,   [state.bike.x, state.bike.y, state.bike.z]);
    gl.uniform1i(loc.uNoFog,      0);

    const bx = state.bike.x, bz = state.bike.z;
    Ground.draw(loc, bx, bz);
    Trees.draw(loc, bx, bz);
    Bushs.draw(loc, bx, bz);
    Rocks.draw(loc, bx, bz);
    Bike.draw(loc, state.bike);
    Moon.draw(loc, eye);   // Moon.draw define uNoFog=1 internamente

    requestAnimationFrame(loop);
}

main();