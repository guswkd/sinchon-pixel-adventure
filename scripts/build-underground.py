"""Preserve surveyed corridor bends and both ends of each entrance stair.
OSM layer is a drawing layer, not a department-store floor number.
B2 naming follows Hyundai's official floor guide, not OSM way 1434541117's name.
"""
import json, math, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
r=ET.parse(ROOT/'reference/map-audit/underground.osm').getroot()
nodes={n.attrib['id']:n for n in r.findall('node')}
ways={w.attrib['id']:w for w in r.findall('way')}
def point(ref):
 n=nodes[str(ref)]
 x=(float(n.attrib['lon'])-126.932)*111320*math.cos(math.radians(37.558))/1.5-48
 y=(37.563-float(n.attrib['lat']))*111320/1.5
 return [round(x,3),round(y,3)]
groups={
 'station':[1434541114,1434541115,1434541116,1434541122,1436159557,1436163441,1436163450,1436170976,1436170978,1436179991,1436179992,1436179999,1436180000,1436180001,1436853627,1436163454],
 'mall':[1434541117,1436853624],
 'uplex':[1436159551],
}
# Ground mouth and lower landing are distinct, surveyed points.
exits=[(1,3404915393,13200578554),(2,3404915394,13200578562),(3,3404915395,13200478460),(4,3404915396,13200478467),(5,3404915398,13200712373),(6,3404915397,13200712367),(7,3617116348,13200657187),(8,3404915400,13200657112)]
refs={str(i) for e in exits for i in e[1:]}
refs.update(map(str,[2364556158,12557603701,13185495411,13200478453,13200478454,13206248860,13200578591,13200578590]))
data={'metresPerTile':1.5,'corridors':{},'nodes':{},'exits':[{'number':e[0],'surface':str(e[1]),'landing':str(e[2])} for e in exits]}
for group,ids in groups.items():
 data['corridors'][group]=[]
 for id in ids:
  w=ways[str(id)]; nds=[n.attrib['ref'] for n in w.findall('nd')];refs.update(nds)
  data['corridors'][group].append({'id':str(id),'nodes':nds,'points':[point(n) for n in nds]})
data['nodes']={ref:{'point':point(ref),'lat':float(nodes[ref].attrib['lat']),'lon':float(nodes[ref].attrib['lon'])} for ref in sorted(refs)}
(ROOT/'assets/underground-geography.js').write_text("'use strict';\nconst UNDERGROUND_GEOGRAPHY="+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
print(f"Built {sum(map(len,data['corridors'].values()))} corridors, {len(refs)} nodes, 8 stair pairs")
