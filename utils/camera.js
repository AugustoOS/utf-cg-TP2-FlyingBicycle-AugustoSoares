const Camera = {
    getEye(state) {
        const { x, y, z, angle } = state.bike;

        if (state.camera.active === 1) {
            const { yaw, pitch } = state.camera.orbit;
            const D = state.camera.zoom;
            return [
                x + D * Math.cos(pitch) * Math.sin(yaw),
                y + D * Math.sin(pitch),
                z + D * Math.cos(pitch) * Math.cos(yaw),
            ];
        }

        // (a) frente, (b) trás, (c) direita, (d) esquerda — câmera um pouco acima olhando levemente para baixo
        const D = 15, H = 6;
        const sideAngles = [Math.PI, 0, -Math.PI / 2, Math.PI / 2];
        const a = angle + sideAngles[state.camera.side];
        return [x + Math.sin(a) * D, y + H, z + Math.cos(a) * D];
    },

    getView(state, eye) {
        if (state.camera.active === 1) {
            // orbit: câmera sempre aponta para o centro da bike
            const center = [state.bike.x, state.bike.y + 1, state.bike.z];
            return Mat4.lookAt(eye, center, [0, 1, 0]);
        }

        const center = [state.bike.x, state.bike.y, state.bike.z];
        return Mat4.lookAt(eye, center, [0, 1, 0]);
    },
};

window.Camera = Camera;