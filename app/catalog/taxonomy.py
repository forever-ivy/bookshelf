from __future__ import annotations

from dataclasses import dataclass
import re

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.catalog.models import Book, BookCategory


CLASSIFICATION_CATEGORY_DEFINITIONS: dict[str, tuple[str, str]] = {
    "A": ("clc-a", "马克思主义、列宁主义、毛泽东思想、邓小平理论"),
    "B": ("clc-b", "哲学、宗教"),
    "C": ("clc-c", "社会科学总论"),
    "D": ("clc-d", "政治、法律"),
    "E": ("clc-e", "军事"),
    "F": ("clc-f", "经济"),
    "G": ("clc-g", "文化、科学、教育、体育"),
    "H": ("clc-h", "语言、文字"),
    "I": ("clc-i", "文学"),
    "J": ("clc-j", "艺术"),
    "K": ("clc-k", "历史、地理"),
    "N": ("clc-n", "自然科学总论"),
    "O": ("clc-o", "数理科学和化学"),
    "P": ("clc-p", "天文学、地球科学"),
    "Q": ("clc-q", "生物科学"),
    "R": ("clc-r", "医药、卫生"),
    "S": ("clc-s", "农业科学"),
    "T": ("clc-t", "工业技术"),
    "U": ("clc-u", "交通运输"),
    "V": ("clc-v", "航空、航天"),
    "X": ("clc-x", "环境科学、安全科学"),
    "Z": ("clc-z", "综合性图书"),
}

CLASSIFICATION_ROOT_PATTERN = re.compile(r"([A-Z])")


@dataclass(frozen=True, slots=True)
class ReaderCategoryGroup:
    key: str
    name: str
    exact_matches: tuple[str, ...] = ()
    contains_matches: tuple[str, ...] = ()
    classification_roots: tuple[str, ...] = ()


READER_CATEGORY_GROUPS: tuple[ReaderCategoryGroup, ...] = (
    ReaderCategoryGroup(
        key="children-picture-books",
        name="童书绘本",
        contains_matches=("儿童", "少儿", "童书", "绘本", "启蒙", "亲子", "幼儿", "宝宝"),
    ),
    ReaderCategoryGroup(
        key="comics-light-novels",
        name="漫画轻小说",
        exact_matches=("bl", "bl漫画", "dc", "marvel", "tb"),
        contains_matches=("漫画", "comic", "comics", "manga", "manhua", "动漫", "二次元", "耽美", "轻小说"),
    ),
    ReaderCategoryGroup(
        key="literature-fiction",
        name="文学小说",
        exact_matches=("priest",),
        contains_matches=("文学", "小说", "散文", "诗歌", "戏剧", "随笔", "故事", "传记", "言情", "武侠", "推理", "科幻", "奇幻"),
        classification_roots=("I",),
    ),
    ReaderCategoryGroup(
        key="humanities-social-sciences",
        name="人文社科",
        contains_matches=("哲学", "宗教", "历史", "地理", "社会", "政治", "法律", "军事", "文化", "纪实"),
        classification_roots=("A", "B", "C", "D", "E", "K", "Z"),
    ),
    ReaderCategoryGroup(
        key="economics-management",
        name="经济管理",
        contains_matches=("经济", "管理", "商业", "财务", "金融", "投资", "营销", "mba", "企业", "创业"),
        classification_roots=("F",),
    ),
    ReaderCategoryGroup(
        key="education-language",
        name="教育语言",
        contains_matches=("教育", "考试", "教辅", "教材", "英语", "语文", "词汇", "语言", "文字", "留学", "学习"),
        classification_roots=("G", "H"),
    ),
    ReaderCategoryGroup(
        key="science-tech",
        name="科学技术",
        exact_matches=("ai",),
        contains_matches=("人工智能", "计算机", "编程", "软件", "网络", "算法", "数据", "科学", "科技", "工程", "工业技术", "环境", "交通", "农业", "化学", "物理", "数学", "生物", "地球科学", "天文"),
        classification_roots=("N", "O", "P", "Q", "S", "T", "U", "V", "X"),
    ),
    ReaderCategoryGroup(
        key="art-design",
        name="艺术设计",
        contains_matches=("艺术", "设计", "美术", "摄影", "音乐", "影视", "电影", "建筑"),
        classification_roots=("J",),
    ),
    ReaderCategoryGroup(
        key="life-health",
        name="生活健康",
        contains_matches=("医学", "医药", "卫生", "健康", "养生", "心理", "育儿", "家庭", "旅行", "美食", "烹饪", "时尚", "健身", "生活"),
        classification_roots=("R",),
    ),
    ReaderCategoryGroup(
        key="journals-papers",
        name="期刊论文",
        contains_matches=("期刊", "论文", "学报", "报告", "conference", "proceedings", "thesis", "dissertation"),
    ),
)

READER_CATEGORY_GROUP_BY_KEY = {group.key: group for group in READER_CATEGORY_GROUPS}
READER_CATEGORY_GROUP_BY_NAME = {group.name.lower(): group for group in READER_CATEGORY_GROUPS}


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _contains_any(haystack: str, needles: tuple[str, ...]) -> bool:
    return any(needle in haystack for needle in needles)


def extract_classification_root(value: str | None) -> str | None:
    cleaned = _clean_text(value)
    if cleaned is None:
        return None
    match = CLASSIFICATION_ROOT_PATTERN.search(cleaned.upper())
    if match is None:
        return None
    root = match.group(1)
    return root if root in CLASSIFICATION_CATEGORY_DEFINITIONS else None


def resolve_reader_category_group(value: str | None) -> ReaderCategoryGroup | None:
    cleaned = _clean_text(value)
    if cleaned is None:
        return None

    normalized = cleaned.lower()
    for group in READER_CATEGORY_GROUPS:
        if normalized in group.exact_matches:
            return group

    for group in READER_CATEGORY_GROUPS:
        if _contains_any(normalized, group.contains_matches):
            return group

    root = extract_classification_root(cleaned)
    if root is None:
        return None

    for group in READER_CATEGORY_GROUPS:
        if root in group.classification_roots:
            return group
    return None


def resolve_reader_category_group_identifier(value: str | None) -> ReaderCategoryGroup | None:
    cleaned = _clean_text(value)
    if cleaned is None:
        return None
    normalized = cleaned.lower()
    return READER_CATEGORY_GROUP_BY_KEY.get(normalized) or READER_CATEGORY_GROUP_BY_NAME.get(normalized)


def build_reader_category_payloads(category_names: list[str]) -> list[dict]:
    items: list[dict] = []
    seen_group_keys: set[str] = set()

    for category_name in category_names:
        group = resolve_reader_category_group(category_name)
        if group is None or group.key in seen_group_keys:
            continue
        seen_group_keys.add(group.key)
        items.append({"id": group.key, "name": group.name})

    return items


def resolve_legacy_category_payload(legacy_category: str | None) -> tuple[str, str] | None:
    root = extract_classification_root(legacy_category)
    if root is None:
        return None
    return CLASSIFICATION_CATEGORY_DEFINITIONS[root]


def ensure_book_category(session: Session, legacy_category: str | None) -> BookCategory | None:
    cleaned_category = _clean_text(legacy_category)
    if cleaned_category is None:
        return None

    category = session.scalar(select(BookCategory).where(BookCategory.name == cleaned_category))
    if category is not None:
        if category.status != "active":
            category.status = "active"
        return category

    payload = resolve_legacy_category_payload(cleaned_category)
    if payload is None:
        return None

    code, name = payload
    category = session.scalar(select(BookCategory).where(BookCategory.code == code))
    if category is not None:
        if category.name != name:
            category.name = name
        if category.status != "active":
            category.status = "active"
        return category

    category = session.scalar(select(BookCategory).where(BookCategory.name == name))
    if category is not None:
        if category.code != code:
            category.code = code
        if category.status != "active":
            category.status = "active"
        return category

    category = BookCategory(
        code=code,
        name=name,
        description=f"由中图法一级大类 {cleaned_category[:1].upper()} 自动映射生成。",
        status="active",
    )
    session.add(category)
    session.flush()
    return category


def backfill_book_taxonomy(session: Session) -> dict[str, int]:
    books = session.scalars(select(Book).order_by(Book.id.asc())).all()
    updated_books = 0

    for book in books:
        linked_category = session.get(BookCategory, book.category_id) if book.category_id is not None else None
        changed = False

        if linked_category is not None:
            if book.category != linked_category.name:
                book.category = linked_category.name
                changed = True
        else:
            category = ensure_book_category(session, book.category)
            if category is None:
                if book.category is not None:
                    book.category = None
                    changed = True
            else:
                if book.category_id != category.id:
                    book.category_id = category.id
                    changed = True
                if book.category != category.name:
                    book.category = category.name
                    changed = True

        if changed:
            updated_books += 1

    session.flush()
    return {
        "books_scanned": len(books),
        "books_updated": updated_books,
    }


def books_need_taxonomy_backfill(session: Session) -> bool:
    needs_backfill = session.scalar(
        select(func.count())
        .select_from(Book)
        .where(
            or_(
                Book.category_id.is_(None) & Book.category.is_not(None),
                Book.category_id.is_(None) & (Book.category != ""),
            )
        )
    )
    return bool(needs_backfill)
