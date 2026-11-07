#!/usr/bin/env python3
"""Aplica el dominio definitivo (SITE_URL) en todo el sitio, de una sola vez.

Uso:   python3 seo/aplicar-site-url.py https://www.tu-dominio.com

SITE_URL vive en seo/SITE_URL.txt: es el valor que hoy aparece en index.html (canonical, og:url, og:image, twitter:image y
JSON-LD), robots.txt (Sitemap) y sitemap.xml. Este script cambia ese valor por el nuevo en esos tres archivos y actualiza
seo/SITE_URL.txt, así que se puede volver a ejecutar si el dominio cambia. Usa solo la biblioteca estándar de Python y no es
parte del sitio (el sitio no lo carga). Mientras SITE_URL sea https://SITE_URL.invalid, no publiques el sitio.
"""
import pathlib
import re
import sys

raiz = pathlib.Path(__file__).resolve().parent.parent
archivo_valor = raiz / 'seo' / 'SITE_URL.txt'
archivos = ['index.html', 'robots.txt', 'sitemap.xml']

if len(sys.argv) != 2:
    sys.exit('Uso: python3 seo/aplicar-site-url.py https://www.tu-dominio.com')
nuevo = sys.argv[1].strip().rstrip('/')
if not re.fullmatch(r'https://[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?', nuevo, re.I) or nuevo.lower().endswith('.invalid'):
    sys.exit('SITE_URL debe verse así: https://www.tu-dominio.com (https, solo el dominio, sin ruta ni barra final)')

actual = archivo_valor.read_text(encoding='utf-8').strip()
if actual == nuevo:
    sys.exit(f'SITE_URL ya es {nuevo}: no hay nada que cambiar.')

total = 0
for nombre in archivos:
    ruta = raiz / nombre
    texto = ruta.read_text(encoding='utf-8')
    n = texto.count(actual)
    if n:
        ruta.write_text(texto.replace(actual, nuevo), encoding='utf-8')
    print(f'{nombre}: {n} cambio(s)')
    total += n
if not total:
    sys.exit(f'No se encontró {actual} en ningún archivo: no se cambió nada (seo/SITE_URL.txt tampoco).')
archivo_valor.write_text(nuevo + '\n', encoding='utf-8')
print(f'SITE_URL = {nuevo}  ({total} cambios en total)')
