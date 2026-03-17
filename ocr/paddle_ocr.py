import os
from collections import Counter

from paddleocr import PaddleOCR

def stabilize_ocr_texts(all_texts, top_k=6):
    clean = [t for t in all_texts if len(t) >= 2]
    return [t for t, _ in Counter(clean).most_common(top_k)]


def stabilize_ocr_results(all_results, top_k=6):
    """
    稳定化带权重的 OCR 结果列表。
    all_results: List[List[dict]]，每次采样返回的 ocr_image_with_weights() 结果
    返回: List[dict]，合并去重后按出现频率和平均权重排序
    """
    from collections import defaultdict
    text_data = defaultdict(lambda: {"count": 0, "weight_sum": 0.0})

    for result_list in all_results:
        for item in result_list:
            t = item["text"]
            if len(t) < 2:
                continue
            text_data[t]["count"] += 1
            text_data[t]["weight_sum"] += item["weight"]

    # 按出现次数 * 平均权重排序
    ranked = sorted(
        text_data.items(),
        key=lambda x: x[1]["count"] * (x[1]["weight_sum"] / x[1]["count"]),
        reverse=True
    )
    return [
        {"text": t, "weight": d["weight_sum"] / d["count"]}
        for t, d in ranked[:top_k]
    ]


ocr_model = PaddleOCR(
    lang='ch',
    use_textline_orientation=True,
    # Prevent PaddleOCR debug logs from leaking into HTTP responses.
    show_log=os.getenv("PADDLEOCR_SHOW_LOG", "0").strip().lower() in ("1", "true", "yes", "on"),
)


def _bbox_height(box) -> float:
    """
    从 bounding box 的四个角坐标计算文字行高度。
    box 格式: [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]，顺时针从左上开始。
    用左侧两点（左上→左下）和右侧两点（右上→右下）的高度均值。
    """
    try:
        left_h  = abs(box[3][1] - box[0][1])
        right_h = abs(box[2][1] - box[1][1])
        return (left_h + right_h) / 2.0
    except Exception:
        return 1.0


def ocr_image(img):
    """
    img: 图片路径(str) 或 OpenCV frame(np.ndarray)
    return: List[str]  —— 仅返回文字（向后兼容）
    """
    return [item["text"] for item in ocr_image_with_weights(img)]


def ocr_image_with_weights(img) -> list:
    """
    img: 图片路径(str) 或 OpenCV frame(np.ndarray)
    return: List[dict]，每个元素：
        {
            "text":   str,    # 识别出的文字
            "weight": float,  # 归一化字体大小权重 (0~1]
            "height": float,  # 原始像素高度，便于调试
            "conf":   float,  # OCR 置信度
        }
    按字体大小从大到小排列。
    """
    result = ocr_model.ocr(img, cls=False)

    raw = []

    if not result:
        return raw

    # PaddleOCR 有时是 [ [line, line, ...] ]
    if isinstance(result, list) and len(result) == 1 and isinstance(result[0], list):
        result = result[0]

    for line in result:
        if isinstance(line, list) and len(line) == 2:
            box  = line[0]          # [[x,y], ...]
            text = line[1][0]       # 文字
            conf = float(line[1][1])  # 置信度
            height = _bbox_height(box)
            raw.append({"text": text, "height": height, "conf": conf})
        elif isinstance(line, tuple):
            # 旧版格式降级处理（无坐标信息）
            raw.append({"text": line[0], "height": 1.0, "conf": 1.0})

    if not raw:
        return raw

    # 归一化：以最大高度为基准，计算相对权重
    max_h = max(item["height"] for item in raw) or 1.0
    for item in raw:
        item["weight"] = round(item["height"] / max_h, 4)

    # 按字体大小降序排列
    raw.sort(key=lambda x: x["weight"], reverse=True)
    return raw
