const OBJLoader = {
    // Parseia texto .obj e retorna arrays flat prontos para GLPanel.createVAO.
    // Suporta: v, vt, vn, f (triângulos e quads), múltiplos objetos/grupos.
    // Formatos de face: v, v/vt, v//vn, v/vt/vn (índices base 1).
    parse(text) {
        const rawPos     = [];   // vec3 por linha
        const rawUV      = [];   // vec2 por linha
        const rawNormal  = [];   // vec3 por linha

        const positions  = [];   // saída flat
        const uvs        = [];
        const normals    = [];

        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue;

            const parts = line.split(/\s+/);
            const token = parts[0];

            if (token === 'v') {
                rawPos.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);

            } else if (token === 'vt') {
                rawUV.push([parseFloat(parts[1]), parseFloat(parts[2])]);

            } else if (token === 'vn') {
                rawNormal.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);

            } else if (token === 'f') {
                // coleta todos os vértices da face e triangula em leque
                const faceVerts = [];
                for (let k = 1; k < parts.length; k++) {
                    faceVerts.push(OBJLoader._parseFaceVert(parts[k], rawPos, rawUV, rawNormal));
                }
                // triangulação em leque: v0-v1-v2, v0-v2-v3, ...
                for (let k = 1; k < faceVerts.length - 1; k++) {
                    OBJLoader._pushVert(faceVerts[0],   positions, uvs, normals);
                    OBJLoader._pushVert(faceVerts[k],   positions, uvs, normals);
                    OBJLoader._pushVert(faceVerts[k+1], positions, uvs, normals);
                }
            }
        }

        return { positions, uvs, normals };
    },

    // Faz fetch de um arquivo .obj e retorna a geometria parseada.
    async load(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OBJLoader: não foi possível carregar ${url}`);
        const text = await res.text();
        return OBJLoader.parse(text);
    },

    _parseFaceVert(token, rawPos, rawUV, rawNormal) {
        const idx = token.split('/');
        const pi  = parseInt(idx[0]) - 1;
        const ti  = idx[1] ? parseInt(idx[1]) - 1 : -1;
        const ni  = idx[2] ? parseInt(idx[2]) - 1 : -1;

        return {
            pos:    rawPos[pi]    || [0, 0, 0],
            uv:     rawUV[ti]     || [0, 0],
            normal: rawNormal[ni] || [0, 1, 0],
        };
    },

    _pushVert(v, positions, uvs, normals) {
        positions.push(v.pos[0],    v.pos[1],    v.pos[2]);
        uvs.push      (v.uv[0],     1 - v.uv[1]);  // inverte V: .obj tem origem embaixo, WebGL em cima
        normals.push  (v.normal[0], v.normal[1], v.normal[2]);
    },
};

window.OBJLoader = OBJLoader;