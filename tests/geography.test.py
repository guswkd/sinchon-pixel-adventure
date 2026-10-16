"""Check generated coordinates against the independently fetched OSM survey."""
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / 'reference/map-audit'
source = json.loads((ROOT / 'reference/map-data.json').read_text())
city = json.loads((ROOT / 'assets/city-geography.js').read_text().split('const CITY_GEOGRAPHY = ')[1].rstrip(';\n'))
live = ET.parse(AUDIT / 'nodes.osm').getroot()
locations = {p['id']: p for p in city['exits'] + city['pois']}
for node in live.findall('node'):
    point = locations[node.get('id')]
    # Project live WGS84 directly into the final grid, bypassing both compilers.
    east = (float(node.get('lon')) - 126.932) * 111320 * math.cos(math.radians(37.558)) - 72
    south = (37.563 - float(node.get('lat'))) * 111320
    error = math.hypot(east - point['x'] * 1.5, south - point['y'] * 1.5)
    assert error <= 1.1, (node.get('id'), error)
assert len(locations) == 14
print('PASS: 8 exits and 6 landmarks are within 1.1 m of live OSM coordinates')

def edge(a, b):
    return tuple(sorted((tuple(a), tuple(b))))

for filename, feature_id in [('hyundai.osm', '19696463'), ('uplex.osm', '356392577')]:
    live = ET.parse(AUDIT / filename).getroot()
    nodes = {n.get('id'): n for n in live.findall('node')}
    ways = {w.get('id'): w for w in live.findall('way')}
    relation = live.find('relation')
    ids = [m.get('ref') for m in relation.findall('member') if m.get('role') == 'outer'] if relation is not None else [feature_id]
    expected = set()
    def project(ref):
        n = nodes[ref]
        return [round((float(n.get('lon'))-126.932)*111320*math.cos(math.radians(37.558))/6+2, 2),
                round((37.563-float(n.get('lat')))*111320/6+2, 2)]
    for way_id in ids:
        refs = [n.get('ref') for n in ways[way_id].findall('nd')]
        expected.update(edge(project(a), project(b)) for a, b in zip(refs, refs[1:]))
    features = [b for b in source['buildings'] if b['id'] == feature_id]
    assert len(features) == 1, 'a single building must not become disconnected fragments'
    points = features[0]['points']
    assert points[0] == points[-1]
    actual = {edge(a, b) for a, b in zip(points, points[1:])}
    assert actual == expected, 'missing boundary or artificial closing diagonal: '+filename
print('PASS: Hyundai and U-PLEX boundaries match every live survey edge, without artificial diagonals')
