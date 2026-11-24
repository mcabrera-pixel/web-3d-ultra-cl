---
title: "Gaussian splatting o escaneo láser: qué pedir en tu planta"
description: Qué es el Gaussian splatting, en qué ayuda dentro de una planta minera y por qué para medir, comparar campañas o modelar sigues necesitando el escaneo láser.
date: 2026-11-24T12:00:00-03:00
category: Guía
capsule: El Gaussian splatting es una técnica que reconstruye una escena a partir de fotos o video y la muestra en tiempo real con un aspecto casi fotográfico. Se diseñó para generar vistas nuevas de la escena, así que entrega una imagen muy convincente y no una geometría verificada. Para medir, comparar campañas o modelar equipos y tuberías, la base sigue siendo una nube de puntos de escaneo láser en un formato abierto como E57. Un splat puede sumarse encima como capa visual cuando el contexto fotográfico aporta.
faq:
  - q: ¿Qué es el Gaussian splatting?
    a: Es una técnica publicada en SIGGRAPH 2023 por investigadores de Inria y del Instituto Max Planck de Informática. Reconstruye una escena desde fotos o video y la representa con millones de gaussianas 3D, pequeñas elipses difusas con posición, forma, opacidad y color. Su gracia es que se puede recorrer en tiempo real con un aspecto casi fotográfico.
  - q: ¿Sirve un splat para medir una planta?
    a: Por sí solo no conviene usarlo para eso. La técnica se diseñó para sintetizar vistas nuevas de una escena, y sus gaussianas no forman una superficie. Para sacar una malla hay que aplicar un paso adicional, y la calidad de ese resultado se tiene que verificar contra una referencia medida, como un escaneo láser.
  - q: ¿En qué ayuda el Gaussian splatting en una planta minera?
    a: En lo visual. Muestra reflejos y brillos de superficies metálicas que suelen romper la fotogrametría tradicional, según un capítulo técnico publicado en septiembre de 2026, y se transmite con menos ancho de banda que una nube de puntos cruda de alta resolución. Eso lo hace útil para recorridos, inducciones o revisar el contexto de una zona a distancia.
  - q: ¿Qué debería pedir si un proveedor me ofrece un gemelo hecho con splats?
    a: Pregunta cómo se fijó la escala y contra qué referencia se verificó, qué error se midió y en qué zonas, y si además entrega la nube de puntos en E57 o solo un visor. Pide también saber si el visor funciona en los computadores de tu faena. Si nadie midió contra una referencia, trátalo como imagen.
  - q: ¿Se pueden combinar el splat y el escaneo láser?
    a: Sí. El escaneo láser deja la geometría medida, que sirve para modelar, comparar campañas y detectar interferencias. El splat se puede montar encima como capa visual para quien necesita reconocer la zona sin abrir una nube de puntos. La pregunta que manda es qué decisión se va a tomar con cada capa.
related:
  - anchor: "Guía: gemelos digitales en fundiciones de cobre"
    url: /guias/gemelos-digitales-fundiciones-cobre
  - anchor: "Caso: gemelo digital área RAF, Fundición Potrerillos"
    url: /casos/gemelo-digital-raf-potrerillos
  - anchor: "Línea base 3D: cómo vigilar una estructura de fundición"
    url: /blog/linea-base-3d-estructuras-fundicion
sister:
  site: as-built.cl
  anchor: "Escaneo terrestre o fotogrametría: cómo elegir"
  url: https://as-built.cl/blog/escaneo-laser-vs-fotogrametria-drones
sources:
  - title: "Kerbl, Kopanas, Leimkühler y Drettakis, 3D Gaussian Splatting for Real-Time Radiance Field Rendering, SIGGRAPH 2023"
    url: https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/
  - title: "Zhou, Osman y Maldague, 3D Scene Understanding for Industrial Environments, IntechOpen, 2026"
    url: https://www.intechopen.com/chapters/1243918
  - title: "Li, Gao, Gu et al., Semantic-guided 3D Gaussian splatting for sparse-view reconstruction in industrial digital twins, Visual Computing for Industry, Biomedicine, and Art, 2026"
    url: https://doi.org/10.1186/s42492-026-00229-x
  - title: "Gemelos digitales en fundiciones de cobre, guía de 3D Ultra"
    url: https://3d-ultra.cl/guias/gemelos-digitales-fundiciones-cobre
  - title: "Gemelo digital del área RAF, Fundición Potrerillos, 3D Ultra"
    url: https://3d-ultra.cl/casos/gemelo-digital-raf-potrerillos
tags: [gaussian splatting, escaneo láser, nube de puntos, gemelo digital, planta virtual]
generated_by: claude
---

Si te han mostrado en los últimos meses un recorrido 3D casi fotográfico de una planta, armado solo con fotos o video, es probable que detrás hubiera Gaussian splatting. La técnica aparece en artículos científicos y en repositorios abiertos, y se ve muy bien. Lo que conviene saber antes de pedirla es qué decisiones aguanta y cuáles no.

## Qué es un splat

El método lo publicaron en SIGGRAPH 2023 investigadores de Inria, la Universidad Côte d'Azur y el Instituto Max Planck de Informática. Parte de un conjunto de fotos o de un video. Con los puntos dispersos que salen de calibrar las cámaras arma una escena hecha de gaussianas 3D, que puedes imaginar como pequeñas elipses difusas, y la ajusta hasta que las vistas generadas se parecen a las fotos. Según sus autores, el resultado se recorre en tiempo real, a 100 cuadros por segundo o más en 1080p.

Un capítulo técnico publicado en septiembre de 2026 por Zhou, Osman y Maldague describe qué guarda cada gaussiana. Tiene un centro, una opacidad, una forma y una orientación, y un color que cambia según desde dónde la mires. Una escena industrial puede tener millones de ellas.

## Dónde brilla en una planta

Ese color que cambia con el ángulo de vista es la parte interesante para minería. El mismo capítulo explica que las superficies metálicas y la iluminación con contrastes fuertes suelen hacer fallar la fotogrametría tradicional, porque los brillos se mueven cuando se mueve la cámara. Las gaussianas pueden representar ese brillo del metal en vez de convertirlo en ruido.

Los autores agregan otra ventaja práctica. Un gemelo armado con gaussianas se puede guardar y transmitir con bastante menos ancho de banda que una nube de puntos cruda de alta resolución.

Con eso, un splat sirve bien para:

- Recorridos de inducción, donde alguien nuevo reconoce una zona antes de ir.
- Revisar a distancia cómo se ve hoy un sector, con sus andamios, carteles y acopios.
- Mostrar el contexto de una intervención a quien no va a abrir una nube de puntos.

## Lo que un splat no trae

El artículo original presenta el método como una forma de sintetizar vistas nuevas de una escena. Ese es su objetivo, y lo cumple. Medir es otra tarea.

Las gaussianas no forman una superficie. Para obtener una malla hay que agregar un paso. Un trabajo publicado en agosto de 2026 por Li, Gao, Gu y otros propone justamente eso para gemelos industriales, con un algoritmo que extrae mallas livianas desde las gaussianas optimizadas. El mismo trabajo reconoce el problema de terreno. En una planta, el espacio suele limitar la captura a pocos puntos de vista, y con pocas vistas faltan las correspondencias necesarias para modelar con exactitud.

Fíjate también en cómo se evalúan estos métodos. Ese trabajo informa sus mejoras con el índice de similitud estructural (SSIM), que compara imágenes. Una buena nota en SSIM dice que la vista generada se parece a la foto. No te dice cuántos milímetros se desvía una brida.

## Para medir, la base sigue siendo el láser

En 3D Ultra la base geométrica de un gemelo es el escaneo láser terrestre. En la [guía de gemelos digitales en fundiciones](/guias/gemelos-digitales-fundiciones-cobre) contamos que trabajamos con un FARO Focus Core, que captura un millón de puntos por segundo con ±1 mm de error lineal, y que la nube se entrega en E57, un formato abierto. Sobre esa nube se modelan equipos, tuberías y estructuras.

Así se hizo en el [área RAF de la Fundición Potrerillos](/casos/gemelo-digital-raf-potrerillos), de CODELCO División Salvador. El levantamiento se hizo en varias sesiones coordinadas con los turnos, porque los planos originales tenían más de 30 años y no reflejaban las modificaciones acumuladas. Lo que se buscaba era planificar paradas con la geometría real, algo que una imagen bonita no resuelve.

Lo mismo pasa cuando quieres saber si una estructura se movió. En el artículo sobre [línea base 3D](/blog/linea-base-3d-estructuras-fundicion) explicamos que dos campañas solo son comparables si están en el mismo sistema de referencia y se miden distancias entre geometrías. Con un splat no tienes esa geometría medida.

## Qué preguntar si te ofrecen un gemelo con splats

| Pregunta | Por qué importa |
|---|---|
| ¿Cómo se fijó la escala y contra qué referencia se verificó? | Sin una referencia medida no sabes si la escena está a escala real. |
| ¿Qué error se midió y en qué zonas? | Una nota de similitud de imagen no reemplaza una desviación en milímetros. |
| ¿Entregan también la nube en E57? | Te deja comparar campañas futuras aunque cambie el software o el proveedor. |
| ¿Funciona el visor en los computadores de la faena? | Un recorrido que solo corre en una estación de diseño no llega a la cuadrilla. |
| ¿Qué decisión se va a tomar con esta capa? | Inducción y contexto, sí. Fabricar, montar o medir desplazamientos, no. |

## Cómo combinarlos

No tienes que elegir uno solo. El escaneo láser deja la geometría medida para ingeniería, mantención y control de interferencias. Un splat puede montarse encima como capa visual para quien necesita reconocer la zona y nada más. Ordénalo según la decisión que vas a tomar, y si alguien te propone reemplazar el escaneo por fotos, pregúntale qué medición respalda ese cambio.

Si tienes una zona de la planta donde se juntan las dos necesidades, escríbenos con el área y lo que quieres decidir con el modelo. Para comparar el escaneo terrestre con la fotogrametría con drones desde el entregable, en [AS-BUILT](https://as-built.cl/blog/escaneo-laser-vs-fotogrametria-drones), otra web de MCCO Group, lo explicamos con detalle.
