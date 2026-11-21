"""Fetch original Garage Bar photography (SpotHopper CDN) and emit responsive AVIF/WebP/JPEG.
Usage: python3 tools/build_images.py <cache_dir>"""
import sys, os, urllib.request, json
from PIL import Image, ImageOps

# name -> (spotapps image id, focal point used only for docs)
PICKS = {
 'oven-fire':'8870768','chef-oven':'7737835','chef-crew':'7737834','chef-portrait':'7737832',
 'collision':'7737781','collision-table':'7737815','neon-sign':'8304850','night':'8018265',
 'pizza-arugula':'8870782','pizza-classic':'7737762','pizza-light':'7737766','pizza-close':'7737838',
 'pizza-board':'7737839','bar-box':'7737825','bar-box-2':'7737828','cocktails-dark':'7737826',
 'cheers':'7737841','blue-wall':'7737790','backbar':'7737850','patio-mural':'7737774',
 'patio-mural-2':'7737776','pingpong':'7737780','patio-open':'7737767','table-hands':'7737806',
 'guinness':'7737813','wrench-stool':'7737846','tire-rack':'7737848','stools':'7737845',
 'pickles':'7737798','espresso':'7737822','lemonade':'7737793','old-fashioned':'7737783',
 'margarita':'7737784','gimlet':'7737792','street':'7737770','spread':'7737809',
}
SPOT='https://www.spothopperapp.com/api/spots/110912'
cache=sys.argv[1]; out=os.path.join(os.path.dirname(__file__),'..','assets','img'); os.makedirs(out,exist_ok=True); os.makedirs(cache,exist_ok=True)
spot=json.load(urllib.request.urlopen(urllib.request.Request(SPOT,headers={'User-Agent':'Mozilla/5.0'})))
paths={str(i['id']):i['urls']['original'] for i in spot['linked']['images']}
manifest={}
for name,iid in PICKS.items():
    src=os.path.join(cache,iid+'.jpg')
    if not os.path.exists(src):
        urllib.request.urlretrieve('https:'+paths[iid],src)
    im=ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    w,h=im.size; manifest[name]={'w':w,'h':h}
    for tw in (640,1200,1920):
        if tw>w and tw!=640: continue
        r=im.resize((tw,round(h*tw/w)),Image.LANCZOS) if tw<w else im
        b=os.path.join(out,f'{name}-{tw}')
        r.save(b+'.avif',quality=50,speed=6)
        r.save(b+'.webp',quality=72,method=6)
        if tw<1920: r.save(b+".jpg",quality=78,optimize=True,progressive=True)
    print(name,w,h)
json.dump(manifest,open(os.path.join(out,'manifest.json'),'w'),indent=1)
