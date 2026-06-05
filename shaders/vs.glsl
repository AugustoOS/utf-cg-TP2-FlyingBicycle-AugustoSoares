#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;

uniform mat4 u_model;        // posição/rotação/escala do objeto no mundo
uniform mat4 u_vp;           // projection * view pré-multiplicados na CPU (uma vez por frame)
uniform mat3 u_normalMatrix; // 3x3 superior do model — transforma normais corretamente

out vec3 v_normal;
out vec3 v_fragPos;
out vec2 v_uv;

void main() {
    // Projection * View * Model — leva o vértice do espaço local até a tela
    gl_Position = u_vp * u_model * vec4(a_position, 1.0);

    v_fragPos = (u_model * vec4(a_position, 1.0)).xyz;
    v_normal  = u_normalMatrix * a_normal;
    v_uv      = a_uv;
}