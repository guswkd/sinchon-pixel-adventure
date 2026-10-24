// Explicit records only: unverified buildings keep their placeholder height.
export const BUILDING_SURVEY={
 '19696463':{floors:12,heightMetres:57,model:'hyundai',
  floorSource:'https://home.ehyundai.com/newPortal/DP/FG/FG000000_V.do?branchCd=B00127000',
  heightSource:'reference/map-audit/hyundai.osm',heightStatus:'OSM, not a measured architectural elevation'},
 '356392577':{floors:12,basements:7,heightMetres:60,roofLabel:'13F SKY GARDEN',model:'uplex',
  floorSource:'https://m.haeahn.com/en/project/detail.do?prjctSeq=624',
  heightSource:'reference/map-audit/uplex.osm',heightStatus:'OSM, not a measured architectural elevation'}
};
export const DETAIL_ZONES=[
 [1,422,616],[2,258,422],[3,145,258],[4,25,145],[5,-45,25]
].flatMap(([section,top,bottom])=>{
 const mid=(top+bottom)/2,west=115,east=350,split=247.5;
 return [['A',west,split,top,mid],['B',split,east,top,mid],['C',west,split,mid,bottom],['D',split,east,mid,bottom]].map(([part,left,right,north,south])=>({id:`0${section}-${part}`,section,left,right,top:north,bottom:south}));
});
DETAIL_ZONES.push(...[['A',350,405,-45,285.5],['B',405,460,-45,285.5],['C',350,405,285.5,616],['D',405,460,285.5,616]].map(([part,left,right,top,bottom])=>({id:`06-${part}`,section:6,left,right,top,bottom})));
export function detailZoneAtSurvey(x,y){return DETAIL_ZONES.find(z=>x>=z.left&&x<=z.right&&y>=z.top&&y<=z.bottom);}
