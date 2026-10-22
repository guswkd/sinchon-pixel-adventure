// Explicit records only: unverified buildings keep their placeholder height.
export const BUILDING_SURVEY={
 '356392577':{floors:12,basements:7,heightMetres:60,roofLabel:'13F SKY GARDEN',model:'uplex',
  floorSource:'https://m.haeahn.com/en/project/detail.do?prjctSeq=624',
  heightSource:'reference/map-audit/uplex.osm',heightStatus:'OSM, not a measured architectural elevation'}
};
export const DETAIL_ZONES=[
 [1,422,616],[2,258,422],[3,145,258],[4,25,145]
].flatMap(([section,top,bottom])=>{
 const mid=(top+bottom)/2,west=145,east=350,split=247.5;
 return [['A',west,split,top,mid],['B',split,east,top,mid],['C',west,split,mid,bottom],['D',split,east,mid,bottom]].map(([part,left,right,north,south])=>({id:`0${section}-${part}`,section,left,right,top:north,bottom:south}));
});
export function detailZoneAtSurvey(x,y){return DETAIL_ZONES.find(z=>x>=z.left&&x<=z.right&&y>=z.top&&y<=z.bottom);}
