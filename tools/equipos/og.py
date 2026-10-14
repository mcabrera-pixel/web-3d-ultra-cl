# tools/equipos/og.py · Imagen para redes (og:image) de cada equipo de la biblioteca, armada desde su póster con Pillow.
# Uso, desde la raíz del repo web y después de preparar.py: python tools/equipos/og.py [<slug> ...]
# Sin slugs prepara todos los equipos de public/biblioteca. Escribe public/biblioteca/<slug>/og.jpg.
# El póster es un WebP transparente de 1600 × 1000: según la red, lo transparente sale negro o blanco, y no todas muestran
# WebP. La imagen para redes es un JPEG opaco de 1200 × 630 con el equipo sobre el fondo del escenario del visor.
import os, sys
from PIL import Image

ANCHO, ALTO = 1200, 630
FONDO = (0xf1, 0xf5, 0xf9, 255)  # escenario del visor (--bib-escenario)
MARGEN = 50  # aire mínimo alrededor del equipo, en px

publico = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'biblioteca')
slugs = sys.argv[1:] or sorted(s for s in os.listdir(publico) if os.path.isfile(os.path.join(publico, s, 'poster.webp')))
for slug in slugs:
    poster = Image.open(os.path.join(publico, slug, 'poster.webp')).convert('RGBA')
    equipo = poster.crop(poster.getchannel('A').getbbox())  # recorta el aire transparente del póster
    escala = min((ANCHO - 2 * MARGEN) / equipo.width, (ALTO - 2 * MARGEN) / equipo.height)
    equipo = equipo.resize((round(equipo.width * escala), round(equipo.height * escala)), Image.LANCZOS)
    lienzo = Image.new('RGBA', (ANCHO, ALTO), FONDO)
    lienzo.alpha_composite(equipo, ((ANCHO - equipo.width) // 2, (ALTO - equipo.height) // 2))
    salida = os.path.join(publico, slug, 'og.jpg')
    lienzo.convert('RGB').save(salida, 'JPEG', quality=85, optimize=True, progressive=True)
    print(f'OG_OK {slug}: {equipo.width} × {equipo.height} px del equipo, {os.path.getsize(salida) / 1e3:.0f} KB')
