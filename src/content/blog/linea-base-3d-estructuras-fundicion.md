---
title: "Línea base 3D: cómo vigilar una estructura de fundición"
description: Cómo usar un primer escaneo láser como línea base para comparar una chimenea u horno de fundición campaña tras campaña y ver cuánto se movió.
date: 2026-11-17T12:00:00-03:00
category: Guía
capsule: Una línea base 3D es el primer escaneo láser completo de una estructura, guardado para compararlo con los escaneos que vengan después. Comparar contra el diseño dice cuánto se aleja la estructura del plano, y comparar contra la línea base dice cuánto se movió desde la última medición. Para que dos campañas sean comparables tienen que estar registradas en el mismo sistema de referencia y guardadas en un formato abierto como E57. En 3D Ultra usamos este enfoque en estructuras de fundición, como la chimenea CPS de CODELCO División Salvador.
faq:
  - q: ¿Qué es una línea base 3D de una estructura?
    a: Es el primer levantamiento con escaneo láser que se guarda como referencia del estado de la estructura en una fecha. Las campañas siguientes se comparan contra ese levantamiento para ver qué zonas se movieron, hacia dónde y cuánto. Sirve sobre todo cuando los planos originales ya no reflejan las reparaciones y modificaciones acumuladas.
  - q: ¿Por qué no basta con comparar cada escaneo contra el CAD de diseño?
    a: Porque esa comparación muestra la desviación total acumulada desde la construcción, sin decir cuándo ocurrió. Si una zona ya estaba fuera del plano hace años y no ha cambiado, la urgencia es distinta a la de una zona que se movió desde la última campaña. Con una línea base puedes separar las dos cosas.
  - q: ¿Hay que detener la planta para escanear?
    a: Depende de la zona. En la chimenea CPS de CODELCO División Salvador el escaneo se hizo sin detener la planta, coordinado con los protocolos de seguridad de la fundición. En los hornos Isasmelt la geometría del horno se escaneó durante una ventana de parada programada.
  - q: ¿En qué formato conviene guardar la nube de puntos?
    a: En E57, el formato abierto de intercambio de datos 3D descrito en la especificación ASTM E2807. Guarda los puntos con atributos como color o intensidad y las fotos tomadas por el equipo. Al ser abierto, la próxima campaña se puede comparar aunque cambie el software o el proveedor.
  - q: ¿Qué debería traer el informe de cada campaña?
    a: Un mapa de colores de las desviaciones, perfiles de verticalidad a distintas alturas, espesores reales comparados con los nominales cuando se pueden medir, la dirección de cada desviación y coordenadas de cada zona. Además, la referencia usada para alinear y la escala de colores, para que la siguiente campaña se lea con el mismo criterio.
related:
  - anchor: "Caso: análisis estructural de la chimenea CPS"
    url: /casos/analisis-chimenea-cps-salvador
  - anchor: "Caso: hornos Isasmelt, extensión de vida útil"
    url: /casos/hornos-isasmelt-extension-vida-util
  - anchor: "Guía: gemelos digitales en fundiciones de cobre"
    url: /guias/gemelos-digitales-fundiciones-cobre
sister:
  site: as-built.cl
  anchor: Qué dice y qué no dice un mapa de desviaciones
  url: https://as-built.cl/blog/control-dimensional-mapa-desviaciones
sources:
  - title: "Análisis estructural de la chimenea CPS, 3D Ultra"
    url: https://3d-ultra.cl/casos/analisis-chimenea-cps-salvador
  - title: "Hornos Isasmelt: extensión de vida útil, 3D Ultra"
    url: https://3d-ultra.cl/casos/hornos-isasmelt-extension-vida-util
  - title: "ASTM E2807, Standard Specification for 3D Imaging Data Exchange, Version 1.0"
    url: https://store.astm.org/e2807-11r19.html
  - title: "How to compare two 3D entities, CloudCompare wiki"
    url: https://www.cloudcompare.org/doc/wiki/index.php/How_to_compare_two_3D_entities
  - title: "Distances Computation, CloudCompare wiki"
    url: https://www.cloudcompare.org/doc/wiki/index.php/DistancesComputation
  - title: "Cloud-to-Mesh Distance, CloudCompare wiki"
    url: https://www.cloudcompare.org/doc/wiki/index.php/Cloud-to-Mesh_Distance
tags: [escaneo láser, línea base, integridad estructural, fundición, monitoreo]
generated_by: claude
---

Un escaneo láser de una chimenea o de un horno te dice cómo está la estructura hoy. Lo que no te dice, si es el único que tienes, es si esa deformación lleva diez años quieta o apareció el último semestre. Para responder eso necesitas un segundo escaneo y, sobre todo, un primero que sirva de referencia. Eso es una línea base 3D.

## Dos preguntas distintas

Cuando comparas una nube de puntos con el CAD de diseño, la respuesta es cuánto se aleja la estructura del plano. Es lo que hicimos en la [chimenea CPS de CODELCO División Salvador](/casos/analisis-chimenea-cps-salvador), donde la nube capturada con un escáner FARO Focus se superpuso al modelo teórico original y mostró zonas con deformaciones fuera de las tolerancias de diseño.

Esa comparación tiene un límite. Muestra todo lo acumulado desde la construcción, sin fecha. Una zona que se deformó hace años y no ha vuelto a moverse aparece igual que otra que se está moviendo ahora.

La segunda pregunta es cuánto se movió la estructura desde la última vez que la mediste. Para contestarla comparas el escaneo nuevo con el anterior. Con las dos respuestas puedes priorizar mejor, porque la urgencia depende de la desviación total y también de si sigue creciendo.

## Por qué el primer escaneo vale más de lo que parece

En la chimenea CPS los planos CAD originales eran de la construcción inicial y no reflejaban décadas de reparaciones, parches y modificaciones. Pasa seguido en fundiciones con estructuras antiguas. El plano deja de ser una buena referencia del estado real, y la primera nube de puntos completa pasa a ser el registro más fiel que tienes.

Por eso uno de los usos que dejó el análisis de la CPS fue documentar el estado de referencia para un monitoreo periódico. Ese levantamiento sirve para diseñar los refuerzos de hoy y además es el punto de comparación de las campañas que vengan.

## Qué hace comparables dos campañas

Comparar dos nubes de puntos parece directo, pero hay detalles que deciden si el resultado sirve.

### El mismo sistema de referencia

Antes de calcular distancias, las dos nubes tienen que quedar registradas, es decir, superpuestas en el mismo sistema de coordenadas. La documentación de CloudCompare, un programa de comparación de nubes de puntos, describe ese paso como un registro aproximado seguido de uno fino con algoritmos como ICP.

Ahí hay una trampa. Si alineas las dos campañas usando la estructura completa, el ajuste intenta hacerlas coincidir y puede esconder justamente el movimiento que buscas. Conviene acordar desde la primera campaña qué elementos se toman como fijos para alinear, y dejarlo escrito en el informe.

### Un formato que siga legible

La guía de [gemelos digitales en fundiciones](/guias/gemelos-digitales-fundiciones-cobre) explica que el levantamiento entrega una nube en formato E57. Ese formato está descrito en la especificación ASTM E2807 y guarda los puntos 3D, atributos como color o intensidad y las fotos tomadas por el equipo. Al ser abierto, la campaña de dentro de unos años se puede comparar con la de hoy aunque cambie el software.

### Nube contra nube o nube contra superficie

Hay dos formas de medir la diferencia. La más simple busca, para cada punto de la nube nueva, el punto más cercano de la nube anterior. Según la documentación de CloudCompare, esa distancia depende de la densidad de la nube de referencia y puede ser imprecisa si esa nube es poco densa. La alternativa es convertir la línea base en una superficie y medir cada punto contra ella, lo que además permite saber hacia qué lado de la superficie quedó cada punto. En una chimenea, eso distingue una pared que se abombó hacia afuera de una que se hundió.

## Qué pedir en cada informe

Para que el informe de una campaña sirva en la siguiente, pide lo mismo cada vez. En la chimenea CPS el análisis comparativo entregó:

- Mapas de colores con las zonas donde la geometría real se aleja de la referencia.
- Perfiles de verticalidad a distintas alturas.
- Espesores de pared reales comparados con los nominales.
- La dirección y magnitud de cada desviación.

Los hallazgos se entregaron con coordenadas, y así el equipo de ingeniería estructural pudo priorizar zonas y diseñar refuerzos con la geometría real. A esa lista súmale dos datos que suelen quedar fuera. El primero es la referencia usada para alinear. El segundo es la escala de colores, con sus unidades y rangos. Si la próxima campaña usa otra escala, dos mapas del mismo muro pueden parecer distintos sin que nada haya cambiado.

## Cuándo escanear

Lo define tu equipo de ingeniería estructural según el activo y su historia. Lo que sí conviene es aprovechar las ventanas que ya existen.

Una parte se puede escanear con la planta operando. En la chimenea CPS el levantamiento se hizo sin detener la planta, coordinado con los protocolos de seguridad de la fundición. Otras zonas solo son accesibles detenidas. En el caso de los [hornos Isasmelt](/casos/hornos-isasmelt-extension-vida-util), la geometría del horno se escaneó durante una ventana de parada programada. Si ya hay una parada en el calendario, sumar el escaneo a esa ventana sale más simple que pedir una aparte.

## Cómo partir

Elige una estructura que hoy te preocupe y que tenga planos poco confiables, como una chimenea, la carcasa de un horno o una nave con reparaciones acumuladas. El primer levantamiento te da el diagnóstico contra el diseño y deja la línea base para las campañas siguientes. Escríbenos con la estructura y las ventanas de acceso que tienes. Si quieres revisar primero cómo leer un solo mapa de desviaciones, en [AS-BUILT](https://as-built.cl/blog/control-dimensional-mapa-desviaciones), otra web de MCCO Group, lo explicamos paso a paso.
