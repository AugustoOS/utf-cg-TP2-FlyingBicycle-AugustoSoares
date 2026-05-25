#version 300 es

precision mediump float;
in vec3 v_normal;
in vec3 v_fragPos;
in vec2 v_uv;

uniform vec3  u_lightPos;
uniform vec3  u_lightColor;
uniform vec3  u_viewPos;
uniform bool  u_useLighting;

uniform float u_ambient;
uniform float u_diffuse;       // intensidade do diffuse (grama ~0.4, demais = 1.0)
uniform float u_shininess;
uniform float u_specular;      // 0 = fosco (grama), 1 = brilhante (metal, pedra)
uniform sampler2D u_texture;

uniform vec3  u_fogColor;
uniform float u_fogDensity;
uniform vec3  u_bikePos;    // posição da bike — fog relativo a ela, não à câmera
uniform bool  u_noFog;      // desativa fog para objetos como a lua

out vec4 outColor;

void main() {
    vec4 texColor = texture(u_texture, v_uv);
    vec4 litColor;

    if (!u_useLighting) {
        litColor = texColor;
    } else {
        vec3 normal     = normalize(v_normal);
        vec3 lightDir   = normalize(u_lightPos - v_fragPos);
        vec3 viewDir    = normalize(u_viewPos - v_fragPos);
        vec3 reflectDir = reflect(-lightDir, normal);

        vec3 ambient  = u_ambient * u_lightColor;
        vec3 diffuse  = u_diffuse * max(dot(normal, lightDir), 0.0) * u_lightColor;
        vec3 specular = u_specular * pow(max(dot(viewDir, reflectDir), 0.0), u_shininess) * u_lightColor;

        litColor = texColor * vec4(ambient + diffuse + specular, 1.0);
    }

    if (u_noFog) {
        outColor = litColor;
        return;
    }

    float dist      = length(u_bikePos - v_fragPos);
    float fogFactor = exp(-pow(u_fogDensity * dist, 2.0));
    fogFactor       = clamp(fogFactor, 0.0, 1.0);
    outColor        = mix(vec4(u_fogColor, 1.0), litColor, fogFactor);
}