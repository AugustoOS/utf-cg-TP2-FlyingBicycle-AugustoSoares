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

        const sideAngles = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
        const a = angle + sideAngles[state.camera.side];
        return [x + Math.sin(a) * 10, y + 3, z + Math.cos(a) * 10];
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