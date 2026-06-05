const OBJLoader = {
    // Parseia texto .obj e retorna arrays flat prontos para GLPanel.createVAO.
    // Quando o .obj não tem vn, computa smooth normals (média das faces por vértice).
    parse(text) {
        const { rawPos, rawUV, rawNormal, triangles } = OBJLoader._collect(text);
        const smoothN = rawNormal.length === 0 ? OBJLoader._smoothNormals(rawPos, triangles) : null;
        return OBJLoader._buildArrays(rawPos, rawUV, rawNormal, triangles, smoothN);
    },

    async load(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OBJLoader: não foi possível carregar ${url}`);
        return OBJLoader.parse(await res.text());
    },

    // Retorna Map<name, {positions,uvs,normals}>, separando por objeto ('o').
    parseGroups(text) {
        const rawPos = [], rawUV = [], rawNormal = [];
        const groups = new Map();
        let current  = null;

        for (const line of text.split('\n')) {
            const l = line.trim();
            if (!l || l.startsWith('#')) continue;
            const parts = l.split(/\s+/);
            const token = parts[0];

            if (token === 'v') {
                rawPos.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (token === 'vt') {
                rawUV.push([parseFloat(parts[1]), parseFloat(parts[2])]);
            } else if (token === 'vn') {
                rawNormal.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (token === 'o' || token === 'g') {
                const name = parts[1] || 'default';
                if (!groups.has(name)) groups.set(name, { tris: [] });
                current = groups.get(name);
            } else if (token === 'f') {
                if (!current) {
                    if (!groups.has('default')) groups.set('default', { tris: [] });
                    current = groups.get('default');
                }
                const fv = OBJLoader._parseFace(parts);
                for (let k = 1; k < fv.length - 1; k++)
                    current.tris.push([fv[0], fv[k], fv[k + 1]]);
            }
        }

        // smooth normals globais (todos os grupos compartilham rawPos)
        const allTris = [...groups.values()].flatMap(g => g.tris);
        const smoothN = rawNormal.length === 0 && allTris.length > 0
            ? OBJLoader._smoothNormals(rawPos, allTris)
            : null;

        const result = new Map();
        for (const [name, g] of groups)
            result.set(name, OBJLoader._buildArrays(rawPos, rawUV, rawNormal, g.tris, smoothN));
        return result;
    },

    async loadGroups(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OBJLoader: não foi possível carregar ${url}`);
        return OBJLoader.parseGroups(await res.text());
    },

    // --- helpers internos ---

    _collect(text) {
        const rawPos = [], rawUV = [], rawNormal = [];
        const triangles = [];

        for (const line of text.split('\n')) {
            const l = line.trim();
            if (!l || l.startsWith('#')) continue;
            const parts = l.split(/\s+/);
            const token = parts[0];

            if (token === 'v') {
                rawPos.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (token === 'vt') {
                rawUV.push([parseFloat(parts[1]), parseFloat(parts[2])]);
            } else if (token === 'vn') {
                rawNormal.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
            } else if (token === 'f') {
                const fv = OBJLoader._parseFace(parts);
                for (let k = 1; k < fv.length - 1; k++)
                    triangles.push([fv[0], fv[k], fv[k + 1]]);
            }
        }
        return { rawPos, rawUV, rawNormal, triangles };
    },

    _parseFace(parts) {
        const fv = [];
        for (let k = 1; k < parts.length; k++) {
            const idx = parts[k].split('/');
            fv.push({
                pi: parseInt(idx[0]) - 1,
                ti: idx[1] ? parseInt(idx[1]) - 1 : -1,
                ni: idx[2] ? parseInt(idx[2]) - 1 : -1,
            });
        }
        return fv;
    },

    _buildArrays(rawPos, rawUV, rawNormal, triangles, smoothN) {
        const positions = [], uvs = [], normals = [];
        for (const [v0, v1, v2] of triangles) {
            for (const v of [v0, v1, v2]) {
                const pos = rawPos[v.pi] || [0, 0, 0];
                const uv  = rawUV[v.ti]  || [0, 0];
                const n   = smoothN ? smoothN[v.pi] : (rawNormal[v.ni] || [0, 1, 0]);
                positions.push(pos[0], pos[1], pos[2]);
                uvs.push(uv[0], 1 - uv[1]);
                normals.push(n[0], n[1], n[2]);
            }
        }
        return { positions, uvs, normals };
    },

    // Smooth normals: acumula normais das faces por índice de posição e normaliza.
    _smoothNormals(rawPos, triangles) {
        const acc = rawPos.map(() => [0, 0, 0]);
        for (const [v0, v1, v2] of triangles) {
            const n = OBJLoader._faceNormal(rawPos[v0.pi], rawPos[v1.pi], rawPos[v2.pi]);
            for (const v of [v0, v1, v2]) {
                acc[v.pi][0] += n[0];
                acc[v.pi][1] += n[1];
                acc[v.pi][2] += n[2];
            }
        }
        return acc.map(a => {
            const len = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
            return len > 0 ? [a[0]/len, a[1]/len, a[2]/len] : [0, 1, 0];
        });
    },

    _faceNormal(p0, p1, p2) {
        const e1 = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
        const e2 = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
        const nx = e1[1]*e2[2] - e1[2]*e2[1];
        const ny = e1[2]*e2[0] - e1[0]*e2[2];
        const nz = e1[0]*e2[1] - e1[1]*e2[0];
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
        return len > 0 ? [nx/len, ny/len, nz/len] : [0, 1, 0];
    },
};

window.OBJLoader = OBJLoader;
