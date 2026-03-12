"""
将餐厅照片处理成地图标记图标：
- 圆形裁剪，带暖色描边
- 尺寸 80x80px（@2x 显示为 40px）
- 输出到 food-map/icons/ 目录
"""
import urllib.request, os, json
from PIL import Image, ImageDraw, ImageFilter
import io

os.makedirs("/Users/xingwenhui/Desktop/food-map/icons", exist_ok=True)

PHOTOS = {
    "spot_9":  ("厨忆小湖南",   "https://aos-comment.amap.com/B0FFJ08YIX/comment/741092AE_9749_41F1_8696_A41CF6C7D106_L0_001_1498_199_1765507195979_95327816.jpg"),
    "spot_10": ("纪家小馆",     "https://aos-comment.amap.com/B0L3FC64M9/comment/content_media_external_images_media_258249_ss__1763650141450_84925695.jpg"),
    "spot_11": ("喜鼎海胆水饺", "https://aos-comment.amap.com/B0KBXAJ429/comment/content_media_external_file_1956_1758759540480_46657658.jpg"),
    "spot_12": ("淮四九宴",     "https://aos-comment.amap.com/B0K61COQZH/comment/content_media_external_file_1000008505_ss__1772674478001_58224286.jpg"),
    "spot_13": ("四华家常菜",   "https://aos-comment.amap.com/B0FFGIN17Y/comment/187F32B8_C3CB_45F9_8C97_1A435C7F6593_L0_001_2000_150_1759281486224_36165209.jpg"),
    "spot_14": ("水一方鱼馆",   "http://store.is.autonavi.com/showpic/7c75130f816b5e48a94865c34affab8a"),
    "spot_15": ("国富老菜馆",   "https://aos-comment.amap.com/B0FFGMTP9O/comment/content_media_external_file_1000042522_ss__1768625980237_25835743.jpg"),
    "spot_16": ("津鲁菜馆",     "https://aos-comment.amap.com/B0HD7SO5M3/comment/b1ac5101d0ddeda3f4b5edd0b2c1bd4c_2048_2048_80.jpg"),
    "spot_17": ("永乐饭店",     "http://store.is.autonavi.com/showpic/104d00b02a6e3cc66f356fb99cf5bbef"),
    "spot_18": ("食庐餐厅",     "https://aos-comment.amap.com/B0FFGMTP9O/comment/content_media_external_file_1000042522_ss__1768625980237_25835743.jpg"),  # fallback
    "spot_19": ("葛记焖饼",     "http://store.is.autonavi.com/showpic/134d660f96723788ace12bb102b36ffd"),
    "spot_20": ("于塗文化餐厅", "http://store.is.autonavi.com/showpic/2165a62b72ea193b678e995d7b43e5be"),
    "spot_21": ("平平898",      "https://aos-comment.amap.com/B0FFJ090C0/comment/FAAA2A5A_E9E6_402D_84B0_113750D14FE7_L0_001_1320_158_1763893975623_22682182.jpg"),
}

# 食庐餐厅单独搜索
import urllib.parse
KEY = "a602cc34799cd6e1aae28d9d8a3b63f0"
url = "https://restapi.amap.com/v3/place/text?keywords={}&city={}&key={}&output=json&extensions=all".format(
    urllib.parse.quote("食庐"), urllib.parse.quote("上海"), KEY
)
req = urllib.request.urlopen(url, timeout=10)
data = json.loads(req.read())
for p in data.get('pois', []):
    if '食庐' in p['name']:
        photos = p.get('photos', [])
        if photos:
            PHOTOS["spot_18"] = ("食庐餐厅", photos[0]['url'])
            print("食庐餐厅照片:", photos[0]['url'][:80])
            break

SIZE = 80  # 输出尺寸
BORDER = 4  # 描边宽度
SHADOW = 3  # 阴影

def make_circle_icon(img_data, out_path, border_color=(212, 132, 90)):
    """将图片裁剪为圆形，加描边和阴影，保存为PNG"""
    try:
        img = Image.open(io.BytesIO(img_data)).convert("RGBA")
    except Exception as e:
        print(f"  图片解析失败: {e}")
        return False

    # 居中裁剪为正方形
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((SIZE, SIZE), Image.LANCZOS)

    # 创建圆形蒙版
    mask = Image.new("L", (SIZE, SIZE), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, SIZE - 1, SIZE - 1), fill=255)

    # 应用圆形蒙版
    result = Image.new("RGBA", (SIZE + SHADOW*2, SIZE + SHADOW*2), (0, 0, 0, 0))

    # 阴影层
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    shadow_mask = Image.new("L", (SIZE, SIZE), 0)
    shadow_draw = ImageDraw.Draw(shadow_mask)
    shadow_draw.ellipse((0, 0, SIZE - 1, SIZE - 1), fill=120)
    shadow.putalpha(shadow_mask)
    shadow_blurred = shadow.filter(ImageFilter.GaussianBlur(SHADOW))
    result.paste(shadow_blurred, (SHADOW, SHADOW), shadow_blurred)

    # 描边层
    border_img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_img)
    border_draw.ellipse((0, 0, SIZE - 1, SIZE - 1), fill=(*border_color, 255))
    result.paste(border_img, (0, 0), border_img)

    # 内圆图片
    inner_size = SIZE - BORDER * 2
    inner_img = img.resize((inner_size, inner_size), Image.LANCZOS)
    inner_mask = Image.new("L", (inner_size, inner_size), 0)
    inner_draw = ImageDraw.Draw(inner_mask)
    inner_draw.ellipse((0, 0, inner_size - 1, inner_size - 1), fill=255)
    inner_img.putalpha(inner_mask)
    result.paste(inner_img, (BORDER, BORDER), inner_img)

    result.save(out_path, "PNG")
    return True

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Referer': 'https://www.amap.com/'
}

for spot_id, (name, photo_url) in PHOTOS.items():
    out_path = f"/Users/xingwenhui/Desktop/food-map/icons/{spot_id}.png"
    print(f"处理 {name} ({spot_id})...")
    try:
        req = urllib.request.Request(photo_url, headers=headers)
        img_data = urllib.request.urlopen(req, timeout=15).read()
        if make_circle_icon(img_data, out_path):
            size = os.path.getsize(out_path)
            print(f"  ✓ 保存 {out_path} ({size} bytes)")
        else:
            print(f"  ✗ 处理失败")
    except Exception as e:
        print(f"  ✗ 下载失败: {e}")

print("\n完成！")
