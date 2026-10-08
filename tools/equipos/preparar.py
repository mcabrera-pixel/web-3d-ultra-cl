# tools/equipos/preparar.py · Prepara un equipo de la biblioteca con Blender 4.5 sin ventana.
# Uso, desde la raíz del repo web:
#   "C:/Program Files/Blender Foundation/Blender 4.5/blender.exe" -b --factory-startup --python tools/equipos/preparar.py -- tools/equipos/<slug>.json [--nodos]
# Con --nodos solo escribe ../biblioteca/salida/<slug>/nodos.json (nombres y caras de cada nodo) para escribir los nombres en español.
# Sin --nodos deja el GLB crudo en ../biblioteca/salida/<slug>/<slug>.crudo.glb (se comprime aparte con gltfpack)
# y en el repo solo public/biblioteca/<slug>/poster.webp y piezas.json.
# Ajustes opcionales del JSON: «excluir» (regex de objetos que no son el equipo, como postes o cables de la escena),
# «materiales» (regex de material → color, metal, rugosidad) y «conjuntos» (une mallas sueltas en una pieza con nombre).
import bpy, sys, os, json, math, re
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
cfg_path = os.path.abspath(args[0])
solo_nodos = '--nodos' in args
cfg = json.load(open(cfg_path, encoding='utf-8'))
repo = os.path.abspath(os.path.join(os.path.dirname(cfg_path), '..', '..'))
marca = os.path.abspath(os.path.join(repo, '..'))
slug = cfg['slug']
fuente = os.path.join(marca, 'biblioteca', 'modelos', cfg['fuente'])
salida = os.path.join(marca, 'biblioteca', 'salida', slug)
publico = os.path.join(repo, 'public', 'biblioteca', slug)
os.makedirs(salida, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
ext = os.path.splitext(fuente)[1].lower()
if ext == '.fbx':
    bpy.ops.import_scene.fbx(filepath=fuente)
elif ext == '.obj':
    bpy.ops.wm.obj_import(filepath=fuente)
elif ext == '.stl':
    bpy.ops.wm.stl_import(filepath=fuente)
elif ext in ('.glb', '.gltf'):
    bpy.ops.import_scene.gltf(filepath=fuente)
else:
    raise SystemExit(f'formato no soportado: {ext} (convertir antes a FBX, OBJ, STL o GLB)')

escena = bpy.context.scene
excluir = [re.compile(p) for p in cfg.get('excluir', [])]
for o in list(escena.objects):
    if o.type in ('LIGHT', 'CAMERA') or any(p.fullmatch(o.name) for p in excluir):
        bpy.data.objects.remove(o, do_unlink=True)
mallas = [o for o in escena.objects if o.type == 'MESH']
if not mallas:
    raise SystemExit('el modelo no trae mallas')


def escribir_json(ruta, datos):
    # LF y salto final, como el resto del repo (en Windows open() escribiría CRLF)
    with open(ruta, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(datos, f, ensure_ascii=False, indent=1)
        f.write('\n')


def unir_conjuntos():
    # Cada malla va al primer conjunto que la reclama, por nombre (regex) o por el centro de su caja dentro de una de
    # sus «cajas» [[x, y, z mín], [x, y, z máx]] (coordenadas de Blender tras importar). Las mallas de un conjunto
    # se unen en un solo nodo con el nombre del conjunto: es la pieza que el visitante toca y que nombres traduce.
    bpy.context.view_layer.update()
    libres = [o for o in escena.objects if o.type == 'MESH']
    for c in cfg.get('conjuntos', []):
        pats = [re.compile(p) for p in c.get('nombres', [])]

        def reclama(o):
            if any(p.fullmatch(o.name) for p in pats):
                return True
            ce = sum((o.matrix_world @ Vector(v) for v in o.bound_box), Vector()) / 8
            return any(all(lo[i] <= ce[i] <= hi[i] for i in range(3)) for lo, hi in c.get('cajas', []))

        miembros = [o for o in libres if reclama(o)]
        if not miembros:
            raise SystemExit(f"el conjunto {c['nodo']} no reúne ninguna malla")
        tomados = {o.name for o in miembros}
        libres = [o for o in libres if o.name not in tomados]
        activo = max(miembros, key=lambda o: len(o.data.polygons))
        if len(miembros) > 1:
            with bpy.context.temp_override(active_object=activo, selected_objects=miembros, selected_editable_objects=miembros):
                bpy.ops.object.join()
        activo.name = c['nodo']
        if activo.name != c['nodo']:
            raise SystemExit(f"el nombre {c['nodo']} ya existe en el modelo")
        print(f"CONJUNTO {c['nodo']}: {len(miembros)} mallas, {len(activo.data.polygons)} caras")


if solo_nodos:
    unir_conjuntos()
    nodos = [{'nodo': o.name, 'tipo': o.type, 'padre': o.parent.name if o.parent else None,
              'caras': len(o.data.polygons) if o.type == 'MESH' else 0} for o in escena.objects]
    escribir_json(os.path.join(salida, 'nodos.json'), nodos)
    print(f'NODOS_OK {len(nodos)} nodos en {os.path.join(salida, "nodos.json")}')
    raise SystemExit(0)


def lineal(hexa):
    hexa = hexa.lstrip('#')
    return [(int(hexa[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4)] + [1]


# Materiales: quita las texturas que no cargaron (salen rosadas en Eevee y blancas en el GLB) y aplica «materiales»
ajustes = [(re.compile(k), v) for k, v in cfg.get('materiales', {}).items()]
for m in bpy.data.materials:
    if not m.use_nodes:
        continue
    for n in [n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and (n.image is None or n.image.size[0] == 0)]:
        m.node_tree.nodes.remove(n)
    regla = next((v for p, v in ajustes if p.fullmatch(m.name)), None)
    bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if regla and bsdf:
        for clave, entrada in (('color', 'Base Color'), ('metal', 'Metallic'), ('rugosidad', 'Roughness')):
            if clave in regla:
                for enlace in list(bsdf.inputs[entrada].links):
                    m.node_tree.links.remove(enlace)
                bsdf.inputs[entrada].default_value = lineal(regla[clave]) if clave == 'color' else regla[clave]

# Pintura por defecto para mallas sin material
pintura = None
for o in mallas:
    if not o.data.materials or all(m is None for m in o.data.materials):
        if pintura is None:
            pintura = bpy.data.materials.new('pintura_base')
            pintura.use_nodes = True
            bsdf = pintura.node_tree.nodes['Principled BSDF']
            bsdf.inputs['Base Color'].default_value = lineal(cfg.get('color_base', '#c9a227'))
            bsdf.inputs['Roughness'].default_value = 0.5
        o.data.materials.clear()
        o.data.materials.append(pintura)

# Decimado proporcional hasta caras_max, aplicado malla por malla antes de unir conjuntos
# (así una pieza chica no se decima por quedar dentro de un conjunto grande)
caras = sum(len(o.data.polygons) for o in mallas)
caras_max = int(cfg.get('caras_max', 200000))
if caras > caras_max:
    ratio = caras_max / caras
    for o in mallas:
        if len(o.data.polygons) > 2000:
            mod = o.modifiers.new('decimar', 'DECIMATE')
            mod.ratio = ratio
    dg = bpy.context.evaluated_depsgraph_get()
    for o in mallas:
        if o.modifiers:
            o.data = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
            o.modifiers.clear()
unir_conjuntos()
mallas = [o for o in escena.objects if o.type == 'MESH']
caras_glb = sum(len(o.data.polygons) for o in mallas)

# Texturas al lado máximo
lado = int(cfg.get('textura_max', 1024))
for img in bpy.data.images:
    if img.size[0] > lado or img.size[1] > lado:
        f = lado / max(img.size)
        img.scale(max(1, int(img.size[0] * f)), max(1, int(img.size[1] * f)))

crudo = os.path.join(salida, f'{slug}.crudo.glb')
bpy.ops.export_scene.gltf(filepath=crudo, export_format='GLB', export_apply=True,
                          export_image_format='JPEG', export_image_quality=82, export_yup=True)

# piezas.json: valida que cada nodo citado exista en la escena
nombres_escena = {o.name for o in escena.objects}
citados = {m['nodo'] for m in cfg['piezas']} | {n for g in cfg['grupos'] for n in g['nodos']}
faltan = sorted(n for n in citados if n not in nombres_escena)
sin_nombre = sorted(n for n in citados if n not in cfg['nombres'])
if faltan or sin_nombre:
    raise SystemExit(f'piezas inconsistentes: faltan en el modelo {faltan}; sin nombre en español {sin_nombre}')
os.makedirs(publico, exist_ok=True)
escribir_json(os.path.join(publico, 'piezas.json'), {'marcadas': cfg['piezas'], 'grupos': cfg['grupos'], 'nombres': cfg['nombres']})

# Póster: misma vista inicial que el visor (fov vertical 35°, objetivo a 0,42 de la altura), fondo transparente
bpy.context.view_layer.update()
mins = Vector((1e18, 1e18, 1e18)); maxs = Vector((-1e18, -1e18, -1e18))
for o in mallas:
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        mins = Vector(map(min, mins, w)); maxs = Vector(map(max, maxs, w))
centro = (mins + maxs) / 2
tam = maxs - mins
radio = tam.length / 2
pivote = bpy.data.objects.new('pivote', None)
escena.collection.objects.link(pivote)
pivote.location = (centro.x, centro.y, mins.z)
bpy.context.view_layer.update()
for o in [o for o in escena.objects if o.parent is None and o is not pivote]:
    o.parent = pivote
    o.matrix_parent_inverse = pivote.matrix_world.inverted()
pivote.location = (0, 0, 0)
bpy.context.view_layer.update()

ancho, alto = 1600, 1000
v = math.radians(35) / 2
h = math.atan(math.tan(v) * ancho / alto)
d = radio * 0.82 / math.sin(min(v, h))
objetivo = Vector((0, 0, tam.z * 0.42))
cam_data = bpy.data.cameras.new('cam')
cam_data.sensor_fit = 'VERTICAL'
cam_data.angle_y = math.radians(35)
cam_data.clip_start = d / 1000
cam_data.clip_end = d * 20
cam = bpy.data.objects.new('cam', cam_data)
escena.collection.objects.link(cam)
escena.camera = cam
# Three.js (Y arriba) (0,55·d, y0 + 0,30·d, 0,78·d) equivale en Blender (Z arriba) a (0,55·d, -0,78·d, y0 + 0,30·d)
cam.location = (d * 0.55, -d * 0.78, objetivo.z + d * 0.30)
cam.rotation_euler = (objetivo - cam.location).to_track_quat('-Z', 'Y').to_euler()

def luz(nombre, pos, potencia, tamano):
    dat = bpy.data.lights.new(nombre, 'AREA'); dat.size = tamano; dat.energy = potencia
    ob = bpy.data.objects.new(nombre, dat); escena.collection.objects.link(ob); ob.location = pos
    ob.rotation_euler = (objetivo - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
escala = (d / 5) ** 2
luz('clave', (d * 0.7, -d * 0.5, d * 0.9), 1800 * escala, radio * 1.5)
luz('relleno', (-d * 0.8, -d * 0.3, d * 0.4), 600 * escala, radio * 2)
luz('contra', (0, d * 0.9, d * 0.7), 900 * escala, radio * 1.5)
mundo = bpy.data.worlds.new('mundo'); escena.world = mundo; mundo.use_nodes = True
mundo.node_tree.nodes['Background'].inputs['Color'].default_value = (0.88, 0.91, 0.95, 1)
mundo.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
for motor in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try:
        escena.render.engine = motor
        break
    except TypeError:
        continue
escena.eevee.taa_render_samples = 32
escena.render.film_transparent = True
escena.view_settings.view_transform = 'AgX'
# Con -0,4 y sin «look», AgX lleva el amarillo y el naranjo a crema; así quedan como en las fotos del equipo
escena.view_settings.look = 'AgX - Medium High Contrast'
escena.view_settings.exposure = -1.2
escena.render.resolution_x, escena.render.resolution_y = ancho, alto
escena.render.image_settings.file_format = 'WEBP'
escena.render.image_settings.color_mode = 'RGBA'
escena.render.image_settings.quality = 82
escena.render.filepath = os.path.join(publico, 'poster.webp')
bpy.ops.render.render(write_still=True)
print(f'PREPARAR_OK {slug}: {caras} caras de origen, {caras_glb} en el GLB, {len(mallas)} mallas, '
      f'crudo {os.path.getsize(crudo) / 1e6:.2f} MB, póster listo')
