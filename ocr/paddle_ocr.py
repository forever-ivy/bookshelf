from paddleocr import PaddleOCR
from collections import Counter

def stabilize_ocr_texts(all_texts, top_k=6):
    clean = [t for t in all_texts if len(t) >= 2]
    return [t for t, _ in Counter(clean).most_common(top_k)]


ocr_model = PaddleOCR(
    lang='ch',
    use_textline_orientation=True
)

def ocr_image(img):
    """
    img: 可以是图片路径(str) 或 OpenCV 的 frame(np.ndarray)
    return: List[str]
    """
    result = ocr_model.ocr(img, cls=False)

    texts = []

    if not result:
        return texts

    # PaddleOCR 有时是 [ [line, line, ...] ]
    if isinstance(result, list) and len(result) == 1 and isinstance(result[0], list):
        result = result[0]

    for line in result:
        if isinstance(line, list) and len(line) == 2:
            text = line[1][0]
            texts.append(text)
        elif isinstance(line, tuple):
            text = line[0]
            texts.append(text)

    return texts