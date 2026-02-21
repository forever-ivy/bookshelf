import cv2
from collections import Counter
from ocr.paddle_ocr import ocr_image
from db.book_match import match_book


def recognize_book_from_camera(max_frames=30):
    cap = cv2.VideoCapture(0)
    all_texts = []
    frame_count = 0

    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        texts = ocr_image(frame)  # 返回 list[str]
        if texts:
            all_texts.extend(texts)

        cv2.imshow("Camera", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        frame_count += 1

    cap.release()
    cv2.destroyAllWindows()

    #没识别到字
    if not all_texts:
        print("未识别到任何文字")
        return None

    #数据清洗 
    # 去掉长度为 1 的噪声字
    clean_texts = [t for t in all_texts if len(t) >= 2]

    if not clean_texts:
        print("清洗后无有效文本")
        return None

    # 取出现频率最高的前 5 个词（稳定）
    common_texts = [
        text for text, _ in Counter(clean_texts).most_common(5)
    ]

    print("稳定 OCR 文本：", common_texts)

    return {
        "ocr_texts": common_texts
    }