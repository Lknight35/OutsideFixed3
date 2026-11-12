import { leafletCss, leafletJs } from "./vendor/leaflet";
export type MapPoint = { id: string; name: string; lat: number; lng: number };
function safeJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
/** Map content is entirely local; only attributed geographic tiles are fetched. */
export function mapDocument(
  input: MapPoint[],
  center?: { lat: number; lng: number },
): string {
  const points = input.filter(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      Math.abs(p.lat) <= 90 &&
      Math.abs(p.lng) <= 180,
  );
  const location =
    center &&
    Number.isFinite(center.lat) &&
    Number.isFinite(center.lng) &&
    Math.abs(center.lat) <= 90 &&
    Math.abs(center.lng) <= 180
      ? center
      : null;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https://tile.openstreetmap.org data:; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'"><style>${leafletCss}\nhtml,body,#map{height:100%;width:100%;margin:0;background:#11131b;font-family:system-ui,sans-serif}.leaflet-tile-pane{filter:brightness(.72) saturate(.7)}.leaflet-control-zoom a{background:#191b23;color:#fff;border-color:#444}.leaflet-control-attribution{background:#15151ee8!important;color:#aaa}.leaflet-control-attribution a{color:#d098ff}.outside-pin{background:#aa35ff;border:3px solid #eedbff;border-radius:50%;box-shadow:0 0 0 7px #9e30ff40,0 3px 12px #0008}.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#1e1e28;color:white}.place-button{background:#9a24ed;border:0;border-radius:12px;color:#fff;font:600 14px system-ui;padding:12px 16px;min-height:44px;max-width:240px}.map-notice{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;background:#17131fed;color:#eee;padding:8px 12px;border-radius:10px;font-size:12px;max-width:80%;pointer-events:none}button:focus-visible{outline:3px solid #fff;outline-offset:3px}</style></head><body><div id="map" role="region" aria-label="Map of recorded places"></div><div id="notice" class="map-notice" hidden>Map imagery is unavailable. Your place list still works.</div><script>${leafletJs.replace(/<\/script/gi, "<\\/script")}</script><script>
const points=${safeJson(points)};
const center=${safeJson(location)};
const map=L.map('map',{zoomControl:true,attributionControl:true}).setView(center?[center.lat,center.lng]:points.length?[points[0].lat,points[0].lng]:[20,0],center||points.length?13:2);
const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).addTo(map);
tiles.on('tileerror',()=>{document.getElementById('notice').hidden=false;});
let bounds=[];
for(const point of points){
 const marker=L.marker([point.lat,point.lng],{icon:L.divIcon({className:'outside-pin',iconSize:[20,20],iconAnchor:[10,10]}),title:point.name,keyboard:true,alt:point.name}).addTo(map);
 const button=document.createElement('button');button.className='place-button';button.textContent=point.name;button.setAttribute('aria-label','Open '+point.name);button.addEventListener('click',()=>{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({id:point.id}));else window.parent.postMessage({type:'outside-map-place',id:point.id},'*');});
 marker.bindPopup(button);bounds.push([point.lat,point.lng]);
}
if(bounds.length>1)map.fitBounds(bounds,{padding:[35,35],maxZoom:15});
window.addEventListener('resize',()=>map.invalidateSize());
</script></body></html>`;
}
