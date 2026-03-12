import urllib.request, urllib.parse, json, time

KEY = "a602cc34799cd6e1aae28d9d8a3b63f0"

restaurants = [
    ("厨忆小湖南", "北京"),
    ("纪家小馆", "北京"),
    ("喜鼎海胆水饺", "北京"),
    ("淮四九宴", "北京"),
    ("四华家常菜", "成都"),
    ("水一方鱼馆", "北京"),
    ("国富老菜馆", "沧州"),
    ("津鲁菜馆", "天津"),
    ("永乐饭店", "成都"),
    ("食庐餐厅", "上海"),
    ("葛记焖饼", "郑州"),
    ("于塗文化餐厅", "重庆"),
    ("平平898", "重庆"),
]

results = {}
for name, city in restaurants:
    url = "https://restapi.amap.com/v3/place/text?keywords={}&city={}&key={}&output=json&extensions=all".format(
        urllib.parse.quote(name), urllib.parse.quote(city), KEY
    )
    try:
        req = urllib.request.urlopen(url, timeout=10)
        data = json.loads(req.read())
        pois = data.get('pois', [])
        if pois:
            photos = pois[0].get('photos', [])
            photo_url = photos[0]['url'] if photos else ''
            results[name] = photo_url
            print("OK {}: {}".format(name, photo_url[:90]))
        else:
            results[name] = ''
            print("NO {}: 无结果".format(name))
    except Exception as e:
        results[name] = ''
        print("ERR {}: {}".format(name, e))
    time.sleep(0.3)

print("\n=== RESULT JSON ===")
print(json.dumps(results, ensure_ascii=False, indent=2))
