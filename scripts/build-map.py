"""Compile public OSM geometry into a compact offline, north-up game map."""
import json, math, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
root=ET.parse(ROOT/'reference/sinchon-osm.xml').getroot()
nodes={n.attrib['id']:n for n in root.findall('node')}
ways={n.attrib['id']:n for n in root.findall('way')}
def tags(e): return {t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
def vertical(t):
 """Preserve surveyed elevated structures instead of flattening them to walls."""
 if t.get('building')!='bridge' and 'min_height' not in t:return {}
 result={'buildingType':t.get('building','yes')}
 for source,dest in [('min_height','minHeight'),('height','height')]:
  if source in t:result[dest]=float(t[source])
 return result
# Six metres per tile, latitude/longitude aspect corrected at Seoul's latitude.
west,north,east,south=126.932,37.563,126.942,37.553
scaleX=111320*math.cos(math.radians(37.558))/6
scaleY=111320/6
w,h=math.ceil((east-west)*scaleX)+4,math.ceil((north-south)*scaleY)+4
def xy(n):return [round((float(n.attrib['lon'])-west)*scaleX+2,2),round((north-float(n.attrib['lat']))*scaleY+2,2)]
def points(e):return [xy(nodes[n.attrib['ref']]) for n in e.findall('nd') if n.attrib['ref'] in nodes]
def intersects(p):return p and min(a[0] for a in p)<w and max(a[0] for a in p)>0 and min(a[1] for a in p)<h and max(a[1] for a in p)>0
def outer_rings(rel):
 """Join member ways by node ID before closing a multipolygon outline."""
 segments=[[n.attrib['ref'] for n in ways[m.attrib['ref']].findall('nd')]
           for m in rel.findall('member') if m.attrib.get('role')=='outer'
           and m.attrib.get('ref') in ways]
 rings=[]
 while segments:
  ring=segments.pop(0)
  while ring[0]!=ring[-1]:
   for i,segment in enumerate(segments):
    if ring[-1]==segment[0]:ring.extend(segment[1:]);break
    if ring[-1]==segment[-1]:ring.extend(segment[-2::-1]);break
   else:raise ValueError('Incomplete building outline: '+rel.attrib['id'])
   segments.pop(i)
  rings.append([xy(nodes[node]) for node in ring])
 return rings
roads=[];buildings=[];parks=[];exits=[];pois=[]
for e in ways.values():
 t=tags(e);p=points(e)
 if not intersects(p):continue
 indoor=t.get('indoor')=='yes' or t.get('tunnel')=='yes' or float(t.get('layer','0').split(';')[0])<0
 if t.get('highway') in ['primary','secondary','tertiary','residential','living_street','service','pedestrian','footway','path','steps','unclassified'] and not indoor:
  roads.append({'id':e.attrib['id'],'name':t.get('name',''),'kind':t['highway'],'points':p,'crossing':t.get('footway')=='crossing'})
 if t.get('building') and not indoor:
  buildings.append({'id':e.attrib['id'],'name':t.get('name',''),'branch':t.get('branch',''),'points':p,**vertical(t)})
 if t.get('leisure') in ['park','garden','pitch'] or t.get('landuse') in ['grass','forest'] or t.get('natural') in ['wood','grassland']:
  parks.append({'name':t.get('name',''),'points':p})
for rel in root.findall('relation'):
 t=tags(rel)
 if t.get('building') and t.get('type')=='multipolygon':
  for p in outer_rings(rel):
   if intersects(p):buildings.append({'id':rel.attrib['id'],'name':t.get('name',''),'branch':t.get('branch',''),'points':p,**vertical(t)})
for n in nodes.values():
 t=tags(n);p=xy(n)
 if not (0<=p[0]<w and 0<=p[1]<h):continue
 location={'id':n.attrib['id'],'x':p[0],'y':p[1],'lat':float(n.attrib['lat']),'lon':float(n.attrib['lon'])}
 if t.get('railway')=='subway_entrance' and '신촌' in t.get('description',''):exits.append({'number':int(t['ref']),**location})
 if t.get('name') in ['홍익문고','연세대 정문','현대백화점 신촌역 지하통로','빨잠 (빨간 잠망경)','신촌역 빨잠 출구','연세로사거리']:
  pois.append({'name':t['name'],**location})
data={'source':'© OpenStreetMap contributors, ODbL 1.0','sourceURL':'https://www.openstreetmap.org/copyright','bounds':{'west':west,'north':north,'east':east,'south':south},'metresPerTile':6,'w':w,'h':h,'roads':roads,'buildings':buildings,'parks':parks,'exits':sorted(exits,key=lambda e:e['number']),'pois':pois}
(ROOT/'assets/world-data.js').write_text('/* Geographic data: © OpenStreetMap contributors, ODbL 1.0. */\nconst WORLD_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'reference/map-data.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('World:',w,h,'Roads:',len(roads),'Buildings:',len(buildings),'Exits:',exits,'POIs:',pois)
