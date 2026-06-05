# utf-cg-TP2-FlyingBicycle-AugustoSoares

Trabalho prático da disciplina de Computação Gráfica (período 11). Uma bicicleta voa sobre um terreno procedural noturno, iluminada pela lua.

**[Abrir no GitHub Pages](https://augustoos.github.io/TP2---CG---Augusto-Soares/)**

---

## O que tem no projeto

- Terreno infinito gerado proceduralmente com somas de ondas senoidais, dividido em chunks carregados dinamicamente conforme a bike se move
- Iluminação Phong (ambient + diffuse + specular) com a lua como fonte de luz
- Névoa volumétrica relativa à posição da bike
- Bicicleta com rodas e eixo dos pedais animados (rotação independente)
- Árvores, arbustos e pedras espalhados deterministicamente por chunk (mesma seed = mesmo mundo)
- Câmera orbit com mouse/touch (arrastar para orbitar, scroll/pinça para zoom)
- Suporte completo a mobile: D-pad touch no canto inferior direito
- Áudio ambiente com tema musical + ruído de vento (botão mute no canto superior direito)

## Controles

| Ação | Teclado | Mobile |
|---|---|---|
| Mover | W / A / S / D ou setas | D-pad |
| Subir / descer | W / seta cima — S / seta baixo | ▲ / ▼ |
| Virar | A / seta esquerda — D / seta direita | ◀ / ▶ |
| Orbitar câmera | Arrastar mouse | Arrastar com 1 dedo |
| Zoom | Scroll | Pinça com 2 dedos |
| Mute | Botão no canto superior direito | — |

## Tecnologias

- WebGL2 com shaders GLSL (`#version 300 es`)
- JavaScript puro, sem frameworks ou bibliotecas externas
- Modelos `.obj` carregados em runtime via `fetch`

## Estrutura

```
shaders/        vs.glsl + fs.glsl (vertex e fragment shader)
libs/           3dlib.js (Mat4/Vec4), webgl.js (setup WebGL), objloader.js
objects/        ground, moon, trees, bushs, rocks, bike
utils/          camera.js
world/          world.html, world.css, world.js (loop principal)
assets/         modelos 3D, texturas, ícones, sons
```


Abrir `http://localhost:3000/world/world.html`.
