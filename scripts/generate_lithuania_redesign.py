from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


OUT_PATH = Path("/Users/user/Documents/memory-system/exports/lithuania-2026-redesign-v6.pdf")
PAGE_WIDTH = 960
PAGE_HEIGHT = 540
MARGIN_X = 54
TOP_Y = 500
CHART_BOTTOM = 92

EMERALD = colors.HexColor("#0B6E4F")
RUBY = colors.HexColor("#8E1B2C")
SAPPHIRE = colors.HexColor("#1F4E79")
BLACK = colors.black
WHITE = colors.white


def tint(base: colors.Color, amount: float) -> colors.Color:
    return colors.Color(
        base.red + (1 - base.red) * amount,
        base.green + (1 - base.green) * amount,
        base.blue + (1 - base.blue) * amount,
    )


SANS_REG = "ArialCustom"
SANS_BOLD = "ArialCustom-Bold"
SERIF_REG = "TimesCustom"
SERIF_BOLD = "TimesCustom-Bold"


def register_fonts() -> None:
    pdfmetrics.registerFont(
        TTFont(SANS_REG, "/System/Library/Fonts/Supplemental/Arial.ttf")
    )
    pdfmetrics.registerFont(
        TTFont(SANS_BOLD, "/System/Library/Fonts/Supplemental/Arial Bold.ttf")
    )
    pdfmetrics.registerFont(
        TTFont(SERIF_REG, "/System/Library/Fonts/Supplemental/Times New Roman.ttf")
    )
    pdfmetrics.registerFont(
        TTFont(SERIF_BOLD, "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf")
    )


TITLE_STYLE = ParagraphStyle(
    "title",
    fontName=SANS_REG,
    fontSize=19,
    leading=22,
    alignment=TA_CENTER,
    textColor=BLACK,
)
TITLE_SMALL_STYLE = ParagraphStyle(
    "title-small",
    parent=TITLE_STYLE,
    fontSize=17,
    leading=20,
)
BODY_STYLE = ParagraphStyle(
    "body",
    fontName=SANS_REG,
    fontSize=10.5,
    leading=13,
    textColor=BLACK,
)
BODY_CENTER = ParagraphStyle("body-center", parent=BODY_STYLE, alignment=TA_CENTER)
BODY_BOLD = ParagraphStyle("body-bold", parent=BODY_STYLE, fontName=SANS_BOLD)
BODY_BOLD_CENTER = ParagraphStyle(
    "body-bold-center", parent=BODY_BOLD, alignment=TA_CENTER
)
SMALL_STYLE = ParagraphStyle(
    "small", fontName=SANS_REG, fontSize=8.6, leading=10.2, textColor=BLACK
)
SMALL_COMPACT = ParagraphStyle(
    "small-compact", parent=SMALL_STYLE, fontSize=7.8, leading=8.8
)
SMALL_CENTER = ParagraphStyle("small-center", parent=SMALL_STYLE, alignment=TA_CENTER)
SMALL_BOLD_CENTER = ParagraphStyle(
    "small-bold-center", parent=SMALL_CENTER, fontName=SANS_BOLD
)
HEADER_CENTER = ParagraphStyle(
    "header-center",
    parent=SMALL_BOLD_CENTER,
    textColor=WHITE,
    fontSize=8.2,
    leading=9.2,
)
AXIS_STYLE = ParagraphStyle(
    "axis", fontName=SANS_REG, fontSize=9.2, leading=10.2, textColor=BLACK
)
AXIS_CENTER = ParagraphStyle("axis-center", parent=AXIS_STYLE, alignment=TA_CENTER)
SERIF_TITLE = ParagraphStyle(
    "serif-title",
    fontName=SERIF_REG,
    fontSize=34,
    leading=40,
    alignment=TA_CENTER,
    textColor=BLACK,
)
SERIF_SUBTITLE = ParagraphStyle(
    "serif-subtitle",
    fontName=SERIF_REG,
    fontSize=22,
    leading=28,
    alignment=TA_CENTER,
    textColor=BLACK,
)
SERIF_METHOD_TITLE = ParagraphStyle(
    "serif-method-title",
    fontName=SERIF_REG,
    fontSize=25,
    leading=28,
    alignment=TA_CENTER,
    textColor=BLACK,
)
SERIF_LABEL = ParagraphStyle(
    "serif-label",
    fontName=SERIF_REG,
    fontSize=10.5,
    leading=12.5,
    textColor=BLACK,
)
SERIF_TEXT = ParagraphStyle(
    "serif-text",
    fontName=SERIF_REG,
    fontSize=8.8,
    leading=11.2,
    textColor=BLACK,
)


@dataclass
class SeriesItem:
    lt: str
    be: str
    value: float
    color: colors.Color


def fmt_pct(value: float) -> str:
    return f"{value:.1f}".replace(".", ",") + "%"


def para(text: str, style: ParagraphStyle, width: float) -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), style)


def draw_paragraph(
    c: canvas.Canvas,
    text: str,
    x: float,
    y_top: float,
    width: float,
    style: ParagraphStyle,
) -> float:
    p = para(text, style, width)
    _, h = p.wrap(width, PAGE_HEIGHT)
    p.drawOn(c, x, y_top - h)
    return h


def draw_title(
    c: canvas.Canvas,
    lt: str,
    be: str,
    *,
    y: float = TOP_Y,
    width: float = PAGE_WIDTH - 2 * MARGIN_X,
    style: ParagraphStyle = TITLE_STYLE,
) -> float:
    return draw_paragraph(c, lt + "\n" + be, MARGIN_X, y, width, style)


def draw_section(c: canvas.Canvas, lt: str, be: str) -> None:
    draw_title(
        c,
        lt,
        be,
        y=330,
        style=ParagraphStyle(
            "section",
            parent=SERIF_TITLE,
            fontSize=30,
            leading=34,
        ),
    )


def draw_cover(c: canvas.Canvas) -> None:
    draw_paragraph(
        c,
        "Lietuvos gyventojų nuomonės<br/>apie baltarusius",
        MARGIN_X,
        382,
        PAGE_WIDTH - 2 * MARGIN_X,
        SERIF_TITLE,
    )
    draw_paragraph(
        c,
        "Беларусы ў вачах жыхароў Літвы",
        MARGIN_X,
        255,
        PAGE_WIDTH - 2 * MARGIN_X,
        SERIF_SUBTITLE,
    )
    draw_paragraph(
        c,
        "Sociologinio tyrimo pristatymas",
        MARGIN_X,
        175,
        PAGE_WIDTH - 2 * MARGIN_X,
        ParagraphStyle("cover-sub-1", parent=SERIF_SUBTITLE, fontSize=18, leading=22),
    )
    draw_paragraph(
        c,
        "Сацыялагічнае даследаванне",
        MARGIN_X,
        140,
        PAGE_WIDTH - 2 * MARGIN_X,
        ParagraphStyle("cover-sub-2", parent=SERIF_SUBTITLE, fontSize=16, leading=20),
    )


def draw_value(c: canvas.Canvas, x: float, y: float, text: str, *, align: str = "left") -> None:
    c.setFont(SANS_REG, 11.5)
    if align == "center":
        c.drawCentredString(x, y, text)
    elif align == "right":
        c.drawRightString(x, y, text)
    else:
        c.drawString(x, y, text)


def draw_horizontal_bar_chart(
    c: canvas.Canvas,
    title_lt: str,
    title_be: str,
    items: list[SeriesItem],
    *,
    max_value: float | None = None,
    top: float = 436,
    bottom: float = CHART_BOTTOM,
    label_w: float = 220,
    title_style: ParagraphStyle = TITLE_STYLE,
) -> None:
    draw_title(c, title_lt, title_be, style=title_style)
    chart_x = MARGIN_X + label_w + 18
    chart_w = PAGE_WIDTH - MARGIN_X - chart_x - 26
    chart_h = top - bottom
    max_val = max_value or max(i.value for i in items)
    step = chart_h / len(items)
    bar_h = min(20, step * 0.42)
    zero_x = chart_x
    c.setLineWidth(1)
    c.setStrokeColor(tint(SAPPHIRE, 0.72))
    c.line(zero_x, bottom - 4, zero_x, top + 4)
    tick_step = 10 if max_val > 30 else 5
    tick = 0
    while tick <= max_val:
        tx = chart_x + chart_w * tick / max_val
        c.setStrokeColor(tint(SAPPHIRE, 0.9))
        c.line(tx, bottom - 4, tx, bottom + 4)
        c.setFont(SANS_REG, 8.8)
        c.setFillColor(BLACK)
        c.drawCentredString(tx, bottom - 18, fmt_pct(tick))
        tick += tick_step
    for idx, item in enumerate(items):
        cy = top - (idx + 0.5) * step
        draw_paragraph(
            c,
            item.lt + "\n" + item.be,
            MARGIN_X,
            cy + 10,
            label_w,
            AXIS_STYLE,
        )
        width = chart_w * item.value / max_val
        c.setFillColor(item.color)
        c.rect(chart_x, cy - bar_h / 2, width, bar_h, fill=1, stroke=0)
        draw_value(c, chart_x + width + 10, cy - 4, fmt_pct(item.value))


def draw_simple_vertical_chart(
    c: canvas.Canvas,
    title_lt: str,
    title_be: str,
    items: list[SeriesItem],
    *,
    top: float = 420,
    bottom: float = 102,
    max_value: float | None = None,
    label_y_offset: float = -12,
    title_style: ParagraphStyle = TITLE_STYLE,
) -> None:
    draw_title(c, title_lt, title_be, style=title_style)
    left = MARGIN_X + 62
    right = PAGE_WIDTH - MARGIN_X - 26
    width = right - left
    height = top - bottom
    max_val = max_value or max(item.value for item in items)
    c.setStrokeColor(tint(SAPPHIRE, 0.65))
    c.line(left, bottom, right, bottom)
    tick_step = 10 if max_val >= 30 else 5
    for tick in range(0, int(max_val) + tick_step, tick_step):
        if tick > max_val:
            continue
        y = bottom + height * tick / max_val
        c.setStrokeColor(tint(SAPPHIRE, 0.9))
        c.line(left, y, right, y)
        c.setFillColor(BLACK)
        c.setFont(SANS_REG, 8.8)
        c.drawRightString(left - 8, y - 3, fmt_pct(tick))
    bar_slot = width / len(items)
    bar_w = min(56, bar_slot * 0.42)
    for idx, item in enumerate(items):
        x = left + idx * bar_slot + (bar_slot - bar_w) / 2
        h = height * item.value / max_val
        c.setFillColor(item.color)
        c.rect(x, bottom, bar_w, h, fill=1, stroke=0)
        draw_value(c, x + bar_w / 2, bottom + h + 9, fmt_pct(item.value), align="center")
        draw_paragraph(
            c,
            item.lt + "\n" + item.be,
            x - 18,
            bottom + label_y_offset,
            bar_w + 36,
            AXIS_CENTER,
        )


def draw_grouped_vertical_chart(
    c: canvas.Canvas,
    title_lt: str,
    title_be: str,
    groups: list[tuple[str, str]],
    series: list[tuple[str, str, colors.Color, list[float]]],
    *,
    top: float = 420,
    bottom: float = 110,
    max_value: float = 100.0,
    series_w_ratio: float = 0.72,
    legend_y: float = 88,
    label_y_offset: float = -12,
    title_style: ParagraphStyle = TITLE_STYLE,
) -> None:
    draw_title(c, title_lt, title_be, style=title_style)
    left = MARGIN_X + 58
    right = PAGE_WIDTH - MARGIN_X - 24
    width = right - left
    height = top - bottom
    c.setStrokeColor(tint(SAPPHIRE, 0.65))
    c.line(left, bottom, right, bottom)
    for tick in range(0, int(max_value) + 1, 10):
        y = bottom + height * tick / max_value
        c.setStrokeColor(tint(SAPPHIRE, 0.88))
        c.line(left, y, right, y)
        c.setFillColor(BLACK)
        c.setFont(SANS_REG, 8.8)
        c.drawRightString(left - 8, y - 3, fmt_pct(tick))
    group_w = width / len(groups)
    series_w = group_w * series_w_ratio
    gap = series_w / (len(series) * 1.4)
    bar_w = (series_w - gap * (len(series) - 1)) / len(series)
    legend_x = MARGIN_X + 110
    for label_lt, label_be, color, _ in series:
        c.setFillColor(color)
        c.rect(legend_x, legend_y - 8, 10, 10, fill=1, stroke=0)
        draw_paragraph(c, label_lt + "\n" + label_be, legend_x + 14, legend_y + 5, 100, AXIS_STYLE)
        legend_x += 130
    for g_idx, (g_lt, g_be) in enumerate(groups):
        start = left + g_idx * group_w + (group_w - series_w) / 2
        for s_idx, (_, _, color, values) in enumerate(series):
            x = start + s_idx * (bar_w + gap)
            h = height * values[g_idx] / max_value
            c.setFillColor(color)
            c.rect(x, bottom, bar_w, h, fill=1, stroke=0)
            draw_value(c, x + bar_w / 2, bottom + h + 8, fmt_pct(values[g_idx]), align="center")
        draw_paragraph(c, g_lt + "\n" + g_be, start - 10, bottom + label_y_offset, series_w + 20, AXIS_CENTER)


def draw_diverging_chart(
    c: canvas.Canvas,
    title_lt: str,
    title_be: str,
    items: list[tuple[str, str, float]],
    *,
    top: float = 420,
    bottom: float = 110,
    label_y_offset: float = -12,
    title_style: ParagraphStyle = TITLE_STYLE,
) -> None:
    draw_title(c, title_lt, title_be, style=title_style)
    left = MARGIN_X + 72
    right = PAGE_WIDTH - MARGIN_X - 20
    width = right - left
    height = top - bottom
    min_val = min(value for _, _, value in items)
    max_val = max(value for _, _, value in items)
    span = max(abs(min_val), abs(max_val))
    c.setStrokeColor(tint(SAPPHIRE, 0.7))
    zero_y = bottom + height * (0 - (-span)) / (2 * span)
    c.line(left, zero_y, right, zero_y)
    tick_step = 5
    tick = -int(span)
    while tick <= int(span):
        y = zero_y + (height / 2) * tick / span if span else zero_y
        c.setStrokeColor(tint(SAPPHIRE, 0.9))
        c.line(left - 4, y, right, y)
        c.setFillColor(BLACK)
        c.setFont(SANS_REG, 8.2)
        c.drawRightString(left - 8, y - 3, fmt_pct(tick))
        tick += tick_step
    slot = width / len(items)
    bar_w = min(52, slot * 0.36)
    for idx, (lt, be, value) in enumerate(items):
        x = left + idx * slot + (slot - bar_w) / 2
        if value >= 0:
            y = zero_y
            h = (height / 2) * value / span
            color = EMERALD
            text_y = y + h + 10
        else:
            h = (height / 2) * abs(value) / span
            y = zero_y - h
            color = RUBY
            text_y = y - 18
        c.setFillColor(color)
        c.rect(x, y, bar_w, h, fill=1, stroke=0)
        draw_value(c, x + bar_w / 2, text_y, fmt_pct(value), align="center")
        draw_paragraph(c, lt + "\n" + be, x - 20, bottom + label_y_offset, bar_w + 40, AXIS_CENTER)


def draw_table(
    c: canvas.Canvas,
    title_lt: str,
    title_be: str,
    rows: list[tuple[str, str, list[str], colors.Color | None]],
    headers: list[str],
    *,
    top: float = 420,
    row_font: ParagraphStyle = BODY_STYLE,
    title_style: ParagraphStyle = TITLE_STYLE,
    first_col_ratio: float = 0.66,
    min_row_height: float = 34,
    cell_padding: float = 14,
) -> None:
    draw_title(c, title_lt, title_be, style=title_style)
    table_x = MARGIN_X
    table_w = PAGE_WIDTH - 2 * MARGIN_X
    first_col = table_w * first_col_ratio
    other_w = (table_w - first_col) / len(headers)
    y = top
    header_h = 24 if all(len(header.replace("\n", " ")) <= 12 for header in headers) else 42
    c.setFillColor(SAPPHIRE)
    c.rect(table_x, y - header_h, table_w, header_h, fill=1, stroke=0)
    x = table_x + first_col
    for header in headers:
        draw_paragraph(c, header, x + 6, y - 8, other_w - 12, HEADER_CENTER)
        x += other_w
    y -= header_h + 4
    for idx, (lt, be, values, accent) in enumerate(rows):
        text = lt + "\n" + be
        shade = tint(accent or SAPPHIRE, 0.82 if idx % 2 == 0 else 0.9)
        cell_height = max(
            min_row_height,
            draw_paragraph(c, text, -10_000, 0, first_col - 18, row_font) + cell_padding,
        )
        c.setFillColor(shade)
        c.rect(table_x, y - cell_height, table_w, cell_height, fill=1, stroke=0)
        if accent:
            c.setFillColor(accent)
            c.rect(table_x, y - cell_height, 7, cell_height, fill=1, stroke=0)
        draw_paragraph(c, text, table_x + 14, y - 6, first_col - 24, row_font)
        x = table_x + first_col
        c.setFont(SANS_BOLD, 11.5)
        c.setFillColor(BLACK)
        for value in values:
            c.drawCentredString(x + other_w / 2, y - cell_height / 2 + 4, value)
            x += other_w
        y -= cell_height + 2


def draw_methodology_mono(
    c: canvas.Canvas,
    title: str,
    rows: list[tuple[str, str]],
) -> None:
    draw_paragraph(c, title, MARGIN_X, 478, PAGE_WIDTH - 2 * MARGIN_X, SERIF_METHOD_TITLE)
    table_x = 106
    icon_w = 52
    label_w = 150
    value_w = 580
    x1 = table_x
    x2 = x1 + icon_w + label_w
    top = 420
    heights = [42, 82, 42, 42, 42, 42, 66, 92]
    y = top
    c.setStrokeColor(tint(SAPPHIRE, 0.78))
    c.setLineWidth(0.6)
    c.line(x1, y, x1 + icon_w + label_w + value_w, y)
    for idx, ((label, value), row_h) in enumerate(zip(rows, heights)):
        next_y = y - row_h
        c.line(x1, next_y, x1 + icon_w + label_w + value_w, next_y)
        c.line(x2, y, x2, next_y)
        # simple monochrome marker instead of decorative icon
        c.setFillColor(BLACK)
        c.circle(x1 + 26, y - row_h / 2 + 2, 6, fill=0, stroke=1)
        label_style = ParagraphStyle(
            f"method-label-{idx}",
            parent=SERIF_LABEL,
            fontSize=14.5,
            leading=16.5,
        )
        value_style = ParagraphStyle(
            f"method-text-{idx}",
            parent=SERIF_TEXT,
            fontSize=12.8,
            leading=15.0,
        )
        draw_paragraph(c, label, x1 + icon_w + 6, y - 12, label_w - 8, label_style)
        draw_paragraph(c, value, x2 + 10, y - 10, value_w - 16, value_style)
        y = next_y


def generate_pdf() -> None:
    register_fonts()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT_PATH), pagesize=(PAGE_WIDTH, PAGE_HEIGHT))
    c.setTitle("Lithuania 2026 redesign")

    slides = []

    def add_page(fn):
        slides.append(fn)

    add_page(draw_cover)
    add_page(
        lambda c: draw_methodology_mono(
            c,
            "TYRIMO METODIKA",
            [
                ("LAIKAS", "2026 01 19–29"),
                (
                    "TIKSLAS",
                    "Išsiaiškinti 2020 m. sprendimo dėl atvykimo vertinimą, nacionalinio saugumo grėsmių ir ekonominio indėlio suvokimą, taip pat režimo legitimumo ir opozicijos lyderės žinomumo vertinimus.",
                ),
                ("TIKSLINĖ GRUPĖ", "Šalies gyventojai nuo 18 iki 75 metų amžiaus."),
                ("IMTIS", "Tyrimo metu buvo apklausta 1017 respondentų."),
                ("ATRANKA", "Tyrime naudotas kvotinės atrankos metodas."),
                ("LOKACIJA", "Visa šalies teritorija."),
                (
                    "APKLAUSOS METODAS",
                    "Kombinuotas metodas: CATI (Computer Assisted Telephone Interview) ir CAWI (Computer Assisted WEB Interview).",
                ),
                (
                    "DUOMENŲ ANALIZĖ",
                    "Analizė atlikta SPSS/PC programine įranga. Ataskaitoje pateikiami bendrieji atsakymų pasiskirstymai (procentais) ir pasiskirstymai pagal socialines-demografines charakteristikas (žr. priedus).",
                ),
            ],
        )
    )
    add_page(
        lambda c: draw_methodology_mono(
            c,
            "МЕТАДАЛОГІЯ ДАСЛЕДАВАННЯ",
            [
                ("ЧАС", "2026 01 19–29"),
                (
                    "МЭТА",
                    "Вызначыць ацэнкі рашэння ўезду ў 2020 годзе, уяўленне нацыянальных пагроз бяспецы і эканамічнага ўнёску, а таксама ацэнкі легітымнасці рэжыму і вядомасці апазіцыйнага лідара.",
                ),
                ("МЭТАВАЯ ГРУПА", "Жыхары краіны ва ўзросце ад 18 да 75 гадоў."),
                ("ВЫБАРКА", "Падчас даследавання было апытана 1017 рэспандэнтаў."),
                ("АДБОР", "Ужываўся квотны метад адбору."),
                ("ЛАКАЦЫЯ", "Тэрыторыя ўсёй краіны."),
                (
                    "МЕТАД АПЫТАННЯ",
                    "Камбінаваны метад: CATI (Computer Assisted Telephone Interview) і CAWI (Computer Assisted WEB Interview).",
                ),
                (
                    "АНАЛІЗ ДАДЗЕНЫХ",
                    "Аналіз праведзены ў праграме SPSS/PC. У справаздачы падаюцца асноўныя размеркаванні адказаў (у працэнтах), а таксама размеркаванні па сацыяльна-дэмаграфічных характарыстыках (гл. дадаткі).",
                ),
            ],
        )
    )
    add_page(lambda c: draw_section(c, "1. Požiūris į baltarusius", "1. Стаўленне да беларусаў"))
    add_page(
        lambda c: draw_horizontal_bar_chart(
            c,
            "Kaip Jūs vertinate Baltarusijos piliečius?",
            "Як вы ставіцеся да грамадзян Беларусі?",
            [
                SeriesItem("Teigiamai", "Пазітыўна", 37.2, EMERALD),
                SeriesItem("Neigiamai", "Негатыўна", 36.6, RUBY),
                SeriesItem("Sunku pasakyti", "Цяжка сказаць", 26.3, SAPPHIRE),
            ],
            max_value=40,
        )
    )
    add_page(
        lambda c: draw_grouped_vertical_chart(
            c,
            "Kaip Jūs vertinate Baltarusijos piliečius?",
            "Як вы ставіцеся да грамадзян Беларусі?",
            [("LT", "LT"), ("LV", "LV"), ("UA", "UA")],
            [
                ("Teigiamai", "Пазітыўна", EMERALD, [37.2, 48.6, 35.6]),
                ("Neigiamai", "Негатыўна", RUBY, [36.6, 26.5, 50.4]),
                ("Sunku pasakyti", "Цяжка сказаць", SAPPHIRE, [26.3, 24.8, 14.0]),
            ],
            max_value=60,
            series_w_ratio=0.52,
            legend_y=58,
        )
    )
    add_page(
        lambda c: draw_diverging_chart(
            c,
            "Teigiamų ir neigiamų nuostatų santykis (amžius)",
            "Баланс пазітыўнага і негатыўнага стаўлення (узрост)",
            [
                ("18-25 m.", "18-25 г.", 8.4),
                ("26-35 m.", "26-35 г.", -19.9),
                ("36-45 m.", "36-45 г.", -4.1),
                ("46-55 m.", "46-55 г.", 9.9),
                ("56 m. ir daugiau", "56 г. і больш", 8.1),
            ],
            label_y_offset=-20,
        )
    )
    add_page(
        lambda c: draw_diverging_chart(
            c,
            "Teigiamų ir neigiamų nuostatų santykis (išsilavinimas)",
            "Баланс пазітыўнага і негатыўнага стаўлення (адукацыя)",
            [
                ("Aukštasis", "Вышэйшая", -8.3),
                ("Vidurinis", "Сярэдняя", 4.8),
                ("Nebaigtas vidurinis", "Незавершаная сярэдняя", 13.5),
            ],
        )
    )
    add_page(
        lambda c: draw_diverging_chart(
            c,
            "Teigiamų ir neigiamų nuostatų santykis (pajamos)",
            "Баланс пазітыўнага і негатыўнага стаўлення (даход)",
            [
                ("Iki 500 Eur", "Да 500 Eur", 1.3),
                ("501-700 Eur", "501-700 Eur", 6.0),
                ("701-1000 Eur", "701-1000 Eur", 7.5),
                ("1001-1500 Eur", "1001-1500 Eur", -12.1),
                ("Daugiau nei 1500 Eur", "Больш за 1500 Eur", -9.6),
            ],
            label_y_offset=-20,
        )
    )
    add_page(
        lambda c: draw_simple_vertical_chart(
            c,
            "Kaip Jūs vertinate Baltarusijos piliečius, gyvenančius Lietuvoje?",
            "Як вы ставіцеся да грамадзян Беларусі, якія жывуць у Літве?",
            [
                SeriesItem("Teigiamai", "Пазітыўна", 41.9, EMERALD),
                SeriesItem("Neigiamai", "Негатыўна", 30.9, RUBY),
                SeriesItem("Sunku pasakyti", "Цяжка сказаць", 27.2, SAPPHIRE),
            ],
            max_value=45,
        )
    )
    add_page(
        lambda c: draw_simple_vertical_chart(
            c,
            "2020 m., kai Baltarusijoje prasidėjo protestai prieš galimą rinkimų klastojimą, Lietuvos vyriausybė leido atvykti į šalį daugeliui žmonių, kurie buvo priversti palikti Baltarusiją. Kaip Jūs vertinate šį sprendimą?",
            "У 2020 годзе, калі ў Беларусі ўспыхнулі пратэсты супраць магчымага фальсіфікавання выбараў, літоўскі ўрад дазволіў многім людзям, якія былі вымушаныя пакінуць Беларусь, уехаць у краіну. Як вы ацэньваеце гэтае рашэнне?",
            [
                SeriesItem("Teigiamai", "Пазітыўна", 49.9, EMERALD),
                SeriesItem("Neigiamai", "Негатыўна", 27.1, RUBY),
                SeriesItem("Sunku pasakyti", "Цяжка сказаць", 23.0, SAPPHIRE),
            ],
            max_value=60,
            top=350,
        )
    )
    add_page(
        lambda c: draw_simple_vertical_chart(
            c,
            "Teigiamai",
            "Пазітыўна",
            [
                SeriesItem("Baltarusijos piliečius", "Грамадзян Беларусі", 37.2, EMERALD),
                SeriesItem(
                    "Piliečius, gyvenančius Lietuvoje",
                    "Грамадзян, якія жывуць у Літве",
                    41.9,
                    EMERALD,
                ),
                SeriesItem("2020 m. migraciją", "Міграцыю 2020 года", 49.9, EMERALD),
            ],
            max_value=60,
        )
    )
    add_page(
        lambda c: draw_simple_vertical_chart(
            c,
            "Ar turite giminių, kolegų, pažįstamų ar kitų asmenų iš Baltarusijos, su kuriais per pastaruosius metus bent kartą palaikėte ryšį? Nesvarbu, ar jie gyvena Baltarusijoje, ar kitose šalyse.",
            "Ці ёсць у вас сваякі, калегі, знаёмыя ці іншыя людзі з Беларусі, з якімі вы падтрымлівалі сувязь хаця б адзін раз за апошні год? Не мае значэння, жывуць яны ў Беларусі ці ў іншых краінах.",
            [
                SeriesItem("Taip", "Так", 12.4, EMERALD),
                SeriesItem("Ne", "Не", 87.6, RUBY),
            ],
            max_value=100,
            top=350,
            title_style=ParagraphStyle("title-p13", parent=TITLE_STYLE, leading=30, fontSize=18.0),
        )
    )
    add_page(
        lambda c: draw_grouped_vertical_chart(
            c,
            "Ar turite giminių, kolegų, pažįstamų ar kitų asmenų iš Baltarusijos, su kuriais per pastaruosius metus bent kartą palaikėte ryšį? Nesvarbu, ar jie gyvena Baltarusijoje, ar kitose šalyse.",
            "Ці ёсць у вас сваякі, калегі, знаёмыя ці іншыя людзі з Беларусі, з якімі вы падтрымлівалі сувязь хаця б адзін раз за апошні год? Не мае значэння, жывуць яны ў Беларусі ці ў іншых краінах.",
            [("LT", "LT"), ("LV", "LV"), ("UA", "UA")],
            [
                ("Taip", "Так", EMERALD, [12.4, 22.5, 7.3]),
                ("Ne", "Не", RUBY, [87.6, 72.1, 92.6]),
            ],
            max_value=100,
            top=360,
            series_w_ratio=0.38,
            legend_y=60,
            title_style=ParagraphStyle("title-p14", parent=TITLE_STYLE, leading=30, fontSize=18.0),
        )
    )
    add_page(
        lambda c: draw_simple_vertical_chart(
            c,
            "Ar turite giminių, kolegų, pažįstamų ar kitų asmenų iš Baltarusijos, su kuriais per pastaruosius metus bent kartą palaikėte ryšį? Nesvarbu, ar jie gyvena Baltarusijoje, ar kitose šalyse (taip).",
            "Ці ёсць у вас сваякі, калегі, знаёмыя ці іншыя людзі з Беларусі, з якімі вы падтрымлівалі сувязь хаця б адзін раз за апошні год? Не мае значэння, жывуць яны ў Беларусі ці ў іншых краінах (так).",
            [
                SeriesItem("Vilnius", "Вільнюс", 21.7, EMERALD),
                SeriesItem("Kiti didieji miestai", "Іншыя буйныя гарады", 7.5, EMERALD),
                SeriesItem("Kitas miestas, rajono centras", "Іншы горад, раённы цэнтр", 9.8, EMERALD),
                SeriesItem("Kaimo vietovė", "Сельская мясцовасць", 12.1, EMERALD),
            ],
            max_value=25,
            top=360,
        )
    )
    add_page(
        lambda c: draw_table(
            c,
            "Kaip Lietuvai reikėtų elgtis su darbo migracija iš Baltarusijos?",
            "Як Літве варта вырашаць пытанне працоўнай міграцыі з Беларусі?",
            [
                ("Siekti sumažinti šiuo metu Lietuvoje esančių darbo migrantų iš Baltarusijos skaičių", "Мэта — скараціць колькасць працоўных мігрантаў з Беларусі, якія цяпер знаходзяцца ў Літве", ["26,8%", "26,2%"], RUBY),
                ("Nutraukti tolesnę darbo migraciją iš Baltarusijos, tačiau nesiimti priemonių mažinti jau esamą jų skaičių", "Спыніць далейшую працоўную міграцыю з Беларусі, але не прымаць мер па скарачэнні ўжо наяўнай колькасці", ["18,1%", "16,3%"], RUBY),
                ("Leisti darbo migraciją tomis pačiomis sąlygomis kaip ir iš kitų ne ES šalių", "Дазволіць працоўную міграцыю на тых самых умовах, што і з іншых краін па-за ЕС", ["37,3%", "30,5%"], SAPPHIRE),
                ("Skatinti darbo migraciją iš Baltarusijos (sudaryti specialias, palankias sąlygas)", "Заахвочваць працоўную міграцыю з Беларусі (стварыць спецыяльныя спрыяльныя ўмовы)", ["3,9%", "6,6%"], EMERALD),
                ("Sunku pasakyti", "Цяжка сказаць", ["13,9%", "20,4%"], SAPPHIRE),
            ],
            ["LT", "LV"],
            top=420,
        )
    )
    add_page(lambda c: draw_section(c, "2. Baltarusijos politika ir valstybė", "2. Беларуская палітыка і дзяржава"))
    add_page(
        lambda c: draw_table(
            c,
            "Su kuriuo iš žemiau pateiktų teiginių Jūs labiausiai sutinkate?",
            "З якім з наступных сцвярджэнняў вы найбольш згодныя?",
            [
                ("Baltarusija yra demokratiška valstybė", "Беларусь — дэмакратычная дзяржава", ["2,6%"], EMERALD),
                ("Baltarusija yra daugiau demokratiška nei autoritarinė", "Беларусь хутчэй дэмакратычная, чым аўтарытарная", ["4,2%"], EMERALD),
                ("Baltarusija daugiau yra autoritarinė nei demokratiška valstybė", "Беларусь хутчэй аўтарытарная, чым дэмакратычная", ["21,9%"], RUBY),
                ("Baltarusija yra autoritarinė valstybė", "Беларусь — аўтарытарная дзяржава", ["54,0%"], RUBY),
                ("Sunku pasakyti", "Цяжка сказаць", ["17,3%"], SAPPHIRE),
            ],
            [""],
        )
    )
    add_page(
        lambda c: draw_table(
            c,
            "Su kuriuo iš žemiau pateiktų teiginių Jūs labiausiai sutinkate?",
            "З якім з наступных сцвярджэнняў вы найбольш згодныя?",
            [
                ("Baltarusija yra demokratiška valstybė", "Беларусь — дэмакратычная дзяржава", ["2,6%", "5,2%", "2,3%"], EMERALD),
                ("Baltarusija yra daugiau demokratiška nei autoritarinė", "Беларусь хутчэй дэмакратычная, чым аўтарытарная", ["4,2%", "11,9%", "6,6%"], EMERALD),
                ("Baltarusija daugiau yra autoritarinė nei demokratiška valstybė", "Беларусь хутчэй аўтарытарная, чым дэмакратычная", ["21,9%", "21,1%", "22,2%"], RUBY),
                ("Baltarusija yra autoritarinė valstybė", "Беларусь — аўтарытарная дзяржава", ["54,0%", "45,9%", "58,3%"], RUBY),
                ("Sunku pasakyti", "Цяжка сказаць", ["17,3%", "15,9%", "10,6%"], SAPPHIRE),
            ],
            ["LT", "LV", "UA"],
        )
    )
    add_page(lambda c: draw_section(c, "3. Užsienio politika", "3. Знешняя палітыка"))
    add_page(
        lambda c: draw_table(
            c,
            "Su kuriuo iš šių teiginių Jūs labiausiai sutinkate?",
            "З якім з гэтых сцвярджэнняў вы найбольш згодныя?",
            [
                ("Baltarusija yra nepriklausoma valstybė, visiškai savarankiška užsienio politikoje", "Беларусь — незалежная дзяржава, цалкам аўтаномная ў знешняй палітыцы", ["6,1%"], EMERALD),
                ("Baltarusija yra nepriklausoma valstybė, kurios užsienio politikai reikšmingą įtaką daro Rusija", "Беларусь — незалежная дзяржава, на знешнюю палітыку якой істотна ўплывае Расія", ["17,7%"], EMERALD),
                ("Baltarusija yra priklausoma valstybė, kurios užsienio politiką beveik visiškai lemia Rusija", "Беларусь — залежная дзяржава, знешняя палітыка якой амаль цалкам вызначаецца Расіяй", ["28,1%"], RUBY),
                ("Baltarusija yra priklausoma valstybė, visiškai kontroliuojama Rusijos (faktiškai Rusijos okupuota valstybė)", "Беларусь — залежная дзяржава, цалкам кантралюемая Расіяй (фактычна акупаваная Расіяй)", ["33,9%"], RUBY),
                ("Sunku pasakyti", "Цяжка сказаць", ["14,2%"], SAPPHIRE),
            ],
            [""],
            top=410,
            row_font=SMALL_STYLE,
            title_style=TITLE_SMALL_STYLE,
        )
    )
    add_page(
        lambda c: draw_table(
            c,
            "Su kuriuo iš šių teiginių Jūs labiausiai sutinkate?",
            "З якім з гэтых сцвярджэнняў вы найбольш згодныя?",
            [
                ("Baltarusija yra nepriklausoma valstybė", "Беларусь — незалежная дзяржава", ["23,8%"], EMERALD),
                ("Baltarusija yra priklausoma valstybė", "Беларусь — залежная дзяржава", ["62,0%"], RUBY),
                ("Sunku pasakyti", "Цяжка сказаць", ["14,2%"], SAPPHIRE),
            ],
            [""],
        )
    )
    add_page(
        lambda c: draw_grouped_vertical_chart(
            c,
            "Su kuriuo iš šių teiginių Jūs labiausiai sutinkate?",
            "З якім з гэтых сцвярджэнняў вы найбольш згодныя?",
            [("LT", "LT"), ("LV", "LV"), ("LV piliečiai", "Грамадзяне ЛВ"), ("UA", "UA")],
            [
                ("Priklausoma valstybė", "Залежная дзяржава", RUBY, [62.0, 49.4, 51.8, 81.6]),
                ("Nepriklausoma valstybė", "Незалежная дзяржава", EMERALD, [23.8, 36.7, 34.7, 13.5]),
                ("Sunku pasakyti", "Цяжка сказаць", SAPPHIRE, [14.2, 13.9, 13.5, 5.0]),
            ],
            max_value=90,
            series_w_ratio=0.48,
            legend_y=58,
        )
    )
    add_page(
        lambda c: draw_horizontal_bar_chart(
            c,
            "Baltarusija yra nepriklausoma valstybė",
            "Беларусь — незалежная дзяржава",
            [
                SeriesItem("Nebalsavau", "Не галасаваў(ла)", 25.1, EMERALD),
                SeriesItem("Kita partija", "Іншая партыя", 23.7, EMERALD),
                SeriesItem("Nacionalinis susivienijimas", "Нацыянальнае аб'яднанне", 27.3, EMERALD),
                SeriesItem("Lietuvos lenkų rinkimų akcija – Krikščioniškų šeimų sąjunga", "Выбарчая акцыя палякаў Літвы — Саюз хрысціянскіх сем'яў", 33.3, EMERALD),
                SeriesItem("Lietuvos valstiečių ir žaliųjų sąjunga", "Саюз сялян і зялёных Літвы", 25.0, EMERALD),
                SeriesItem("Liberalų sąjūdis", "Ліберальны рух", 16.5, EMERALD),
                SeriesItem("Demokratų sąjunga „Vardan Lietuvos“", "Дэмакратычны саюз «Дзеля Літвы»", 21.6, EMERALD),
                SeriesItem("Partija „Nemuno aušra“", "Партыя «Світанак Нёмана»", 34.6, EMERALD),
                SeriesItem("Tėvynės sąjunga – Lietuvos konservatoriai", "Саюз Айчыны — літоўскія кансерватары", 14.0, EMERALD),
                SeriesItem("Socialdemokratų partija", "Сацыял-дэмакратычная партыя", 26.4, EMERALD),
            ],
            max_value=40,
            label_w=290,
            top=430,
        )
    )
    add_page(
        lambda c: draw_table(
            c,
            "Kokią politiką Lietuva turėtų vykdyti Baltarusijos atžvilgiu?",
            "Якую палітыку павінна праводзіць Літва ў дачыненні да Беларусі?",
            [
                ("Vykdyti užsienio politikos izoliacijos ir sankcijų politiką", "Праводзіць палітыку ізаляцыі і санкцый", ["30,0%", "34,9%"], RUBY),
                ("Aktyviai neplėtoti bendradarbiavimo, tačiau palaikyti santykius su Baltarusijos valdžia tose srityse, kurios yra ekonomiškai svarbios", "Не развіваць супрацоўніцтва актыўна, але падтрымліваць адносіны з уладамі Беларусі ў сферах эканамічнага інтарэсу", ["39,9%", "29,4%"], SAPPHIRE),
                ("Plėtoti visapusišką bendradarbiavimą ir partnerystę su Baltarusijos valdžia", "Развіваць усебаковае супрацоўніцтва і партнёрства з уладамі Беларусі", ["13,2%", "21,6%"], EMERALD),
                ("Sunku pasakyti", "Цяжка сказаць", ["16,9%", "14,2%"], SAPPHIRE),
            ],
            ["LT", "LV"],
            top=420,
        )
    )
    add_page(
        lambda c: draw_simple_vertical_chart(
            c,
            "Vykdyti užsienio politikos izoliacijos ir sankcijų politiką",
            "Праводзіць палітыку ізаляцыі і санкцый",
            [
                SeriesItem("Iki 500 Eur", "Да 500 Eur", 18.4, RUBY),
                SeriesItem("501-700 Eur", "501-700 Eur", 26.4, RUBY),
                SeriesItem("701-1000 Eur", "701-1000 Eur", 25.6, RUBY),
                SeriesItem("1001-1500 Eur", "1001-1500 Eur", 38.4, RUBY),
                SeriesItem("Daugiau nei 1500 Eur", "Больш за 1500 Eur", 51.1, RUBY),
            ],
            max_value=60,
        )
    )
    add_page(
        lambda c: draw_simple_vertical_chart(
            c,
            "Vykdyti užsienio politikos izoliacijos ir sankcijų politiką",
            "Праводзіць палітыку ізаляцыі і санкцый",
            [
                SeriesItem("Vilnius", "Вільнюс", 41.9, RUBY),
                SeriesItem("Kiti didieji miestai", "Іншыя буйныя гарады", 28.3, RUBY),
                SeriesItem("Kitas miestas, rajono centras", "Іншы горад, раённы цэнтр", 29.7, RUBY),
                SeriesItem("Kaimo vietovė", "Сельская мясцовасць", 22.5, RUBY),
            ],
            max_value=45,
        )
    )
    add_page(lambda c: draw_section(c, "4. Kultūra, istorija ir tapatybė", "4. Культура, гісторыя і ідэнтычнасць"))
    add_page(
        lambda c: draw_horizontal_bar_chart(
            c,
            "Kaip Jūs vertintumėte, jei herbas, paremtas LDK „Vyčiu“, vėl taptų Baltarusijos valstybiniu simboliu (kaip tai buvo 1991-1995 m.)?",
            "Як бы вы паставіліся да сітуацыі, калі б герб Вялікага Княства Літоўскага («Пагоня») зноў стаў дзяржаўным сімвалам Беларусі (як гэта было ў 1991-1995 гадах)?",
            [
                SeriesItem("Teigiamai", "Пазітыўна", 3.4, EMERALD),
                SeriesItem("Greičiau teigiamai", "Хутчэй пазітыўна", 15.9, EMERALD),
                SeriesItem("Greičiau neigiamai", "Хутчэй негатыўна", 15.0, RUBY),
                SeriesItem("Neigiamai", "Негатыўна", 32.1, RUBY),
                SeriesItem("Man tai nesvarbu", "Для мяне гэта не мае значэння", 16.4, SAPPHIRE),
                SeriesItem("Sunku pasakyti", "Цяжка сказаць", 17.1, SAPPHIRE),
            ],
            max_value=35,
            top=400,
            label_w=250,
            title_style=ParagraphStyle("title-p29", parent=TITLE_STYLE, leading=30, fontSize=17.0),
        )
    )
    add_page(
        lambda c: draw_simple_vertical_chart(
            c,
            "Kaip Jūs vertintumėte, jei herbas, paremtas LDK „Vyčiu“, vėl taptų Baltarusijos valstybiniu simboliu (teigiamai arba greičiau teigiamai)?",
            "Як бы вы паставіліся да сітуацыі, калі б герб ВКЛ «Пагоня» зноў стаў дзяржаўным сімвалам Беларусі (пазітыўна або хутчэй пазітыўна)?",
            [
                SeriesItem("Vilnius", "Вільнюс", 53.0, EMERALD),
                SeriesItem("Kiti didieji miestai", "Іншыя буйныя гарады", 49.2, EMERALD),
                SeriesItem("Kitas miestas, rajono centras", "Іншы горад, раённы цэнтр", 43.2, EMERALD),
                SeriesItem("Kaimo vietovė", "Сельская мясцовасць", 44.3, EMERALD),
            ],
            max_value=60,
            top=360,
        )
    )
    add_page(
        lambda c: draw_table(
            c,
            "Su kuriuo iš šių teiginių Jūs labiausiai sutinkate?",
            "З якім з гэтых сцвярджэнняў вы найбольш згодныя?",
            [
                ("Lietuvos Didžiosios Kunigaikštystės politinis ir kultūrinis paveldas priklauso tik lietuvių tautai", "Палітычная і культурная спадчына Вялікага Княства Літоўскага належыць выключна літоўскаму народу", ["25,8%"], None),
                ("Lietuvos Didžiosios Kunigaikštystės politinis ir kultūrinis paveldas priklauso visoms tautoms, kurios joje gyveno", "Палітычная і культурная спадчына Вялікага Княства Літоўскага належыць усім народам, якія там жылі", ["34,4%"], None),
                ("Lietuvos Didžiosios Kunigaikštystės politinis ir kultūrinis paveldas priklauso lietuvių ir lenkų tautoms", "Палітычная і культурная спадчына Вялікага Княства Літоўскага належыць літоўскаму і польскаму народу", ["9,2%"], None),
                ("Lietuvos Didžiosios Kunigaikštystės politinis ir kultūrinis paveldas priklauso lietuvių ir baltarusių tautoms", "Палітычная і культурная спадчына Вялікага Княства Літоўскага належыць літоўскаму і беларускаму народу", ["3,6%"], None),
                ("Nesutinku nė su vienu iš pateiktų teiginių", "Не згодны ні з адным са сцвярджэнняў", ["6,2%"], None),
                ("Sunku pasakyti", "Цяжка сказаць", ["20,7%"], None),
            ],
            [""],
            top=420,
            row_font=SMALL_STYLE,
            title_style=TITLE_SMALL_STYLE,
        )
    )
    add_page(
        lambda c: draw_horizontal_bar_chart(
            c,
            "Pastaraisiais metais Lietuvoje vyko daug viešų diskusijų apie „litvinizmą“. Ar esate girdėję apie šias diskusijas?",
            "У апошнія гады ў Літве адбылося шмат публічных дыскусій пра «літвінізм». Ці чулі вы пра гэтыя дыскусіі?",
            [
                SeriesItem("Taip", "Так", 29.0, EMERALD),
                SeriesItem("Ne", "Не", 54.8, RUBY),
                SeriesItem("Sunku pasakyti", "Цяжка сказаць", 16.2, SAPPHIRE),
            ],
            max_value=60,
            top=400,
            label_w=220,
        )
    )
    add_page(
        lambda c: draw_simple_vertical_chart(
            c,
            "Ne",
            "Не",
            [
                SeriesItem("Vilnius", "Вільнюс", 45.2, RUBY),
                SeriesItem("Kiti didieji miestai", "Іншыя буйныя гарады", 54.7, RUBY),
                SeriesItem("Kitas miestas, rajono centras", "Іншы горад, раённы цэнтр", 61.3, RUBY),
                SeriesItem("Kaimo vietovė", "Сельская мясцовасць", 56.1, RUBY),
            ],
            max_value=70,
        )
    )
    add_page(
        lambda c: draw_table(
            c,
            "Kuriuos iš žemiau išvardintų Baltarusijos kultūros veikėjų (rašytojų, intelektualų, muzikantų ir kt.) Jūs žinote?",
            "Каго з пералічаных дзеячаў культуры Беларусі (пісьменнікаў, інтэлектуалаў, музыкаў і г.д.) вы ведаеце?",
            [
                ("Eufrosinija Polockaja", "Ефрасіння Полацкая", ["1,3%"], None),
                ("Pranciškus Skorina", "Францыск Скарына", ["20,9%"], None),
                ("Konstantinas (Kastusis) Kalinauskas", "Кастусь Каліноўскі", ["25,8%"], None),
                ("Jakubas Kolasas", "Якуб Колас", ["6,6%"], None),
                ("Janka Kupala", "Янка Купала", ["25,2%"], None),
                ("Vladimiras Karatkevičius", "Уладзімір Караткевіч", ["3,8%"], None),
                ("Svetlana Aleksijevič", "Святлана Алексіевіч", ["13,3%"], None),
                ("Vseslavas Polockietis (Burtininkas)", "Усяслаў Полацкі (Чарадзей)", ["2,6%"], None),
                ("Vasilijus Bykovas", "Васіль Быкаў", ["8,0%"], None),
                ("Nežinau nė vieno", "Нікога не ведаю", ["52,6%"], None),
                ("Sunku pasakyti", "Цяжка сказаць", ["4,5%"], None),
            ],
            [""],
            top=404,
            row_font=SMALL_COMPACT,
            title_style=ParagraphStyle("title-xs-33", parent=TITLE_SMALL_STYLE, fontSize=15, leading=17),
            min_row_height=29,
            cell_padding=10,
        )
    )
    add_page(
        lambda c: draw_table(
            c,
            "Kuriuos iš žemiau išvardintų Baltarusijos kultūros veikėjų (rašytojų, intelektualų, muzikantų ir kt.) Jūs žinote?",
            "Каго з пералічаных дзеячаў культуры Беларусі (пісьменнікаў, інтэлектуалаў, музыкаў і г.д.) вы ведаеце?",
            [
                ("Eufrosinija Polockaja", "Ефрасіння Полацкая", ["1,3%", "2,8%"], None),
                ("Pranciškus Skorina", "Францыск Скарына", ["20,9%", "4,4%"], None),
                ("Konstantinas (Kastusis) Kalinauskas", "Кастусь Каліноўскі", ["25,8%", "20,9%"], None),
                ("Jakubas Kolasas", "Якуб Колас", ["6,6%", "7,5%"], None),
                ("Janka Kupala", "Янка Купала", ["25,2%", "12,7%"], None),
                ("Vladimiras Karatkevičius", "Уладзімір Караткевіч", ["3,8%", "5,2%"], None),
                ("Svetlana Aleksijevič", "Святлана Алексіевіч", ["13,3%", "4,2%"], None),
                ("Vseslavas Polockietis (Burtininkas)", "Усяслаў Полацкі (Чарадзей)", ["2,6%", "2,8%"], None),
                ("Vasilijus Bykovas", "Васіль Быкаў", ["8,0%", "NA"], None),
                ("Nežinau nė vieno", "Нікога не ведаю", ["52,6%", "65,0%"], None),
                ("Sunku pasakyti", "Цяжка сказаць", ["4,5%", "7,3%"], None),
            ],
            ["LT", "UA"],
            top=404,
            row_font=SMALL_COMPACT,
            title_style=ParagraphStyle("title-xs-34", parent=TITLE_SMALL_STYLE, fontSize=15, leading=17),
            min_row_height=29,
            cell_padding=10,
        )
    )
    add_page(
        lambda c: draw_table(
            c,
            "Kuriuos iš žemiau išvardintų Baltarusijos kultūros veikėjų Jūs žinote?",
            "Каго з пералічаных дзеячаў культуры Беларусі вы ведаеце?",
            [
                ("Pranciškus Skorina", "Францыск Скарына", ["11,1%", "8,6%", "17,9%", "15,9%", "36,5%"], None),
                ("Janka Kupala", "Янка Купала", ["10,0%", "10,2%", "15,6%", "19,6%", "48,6%"], None),
                ("Konstantinas (Kastusis) Kalinauskas", "Кастусь Каліноўскі", ["13,3%", "12,4%", "21,2%", "24,8%", "41,0%"], None),
                ("Svetlana Aleksijevič", "Святлана Алексіевіч", ["6,7%", "7,5%", "9,4%", "9,8%", "23,5%"], None),
            ],
            ["18-25 m.\n18-25 г.", "26-35 m.\n26-35 г.", "36-45 m.\n36-45 г.", "46-55 m.\n46-55 г.", "56+ m.\n56+ г."],
            top=416,
            row_font=SMALL_STYLE,
            title_style=TITLE_SMALL_STYLE,
            first_col_ratio=0.56,
        )
    )
    add_page(
        lambda c: draw_table(
            c,
            "Kuriuos iš žemiau išvardintų Baltarusijos kultūros veikėjų Jūs žinote?",
            "Каго з пералічаных дзеячаў культуры Беларусі вы ведаеце?",
            [
                ("Pranciškus Skorina", "Францыск Скарына", ["35,0%", "16,9%", "17,3%", "17,1%"], None),
                ("Janka Kupala", "Янка Купала", ["31,8%", "24,4%", "22,6%", "23,2%"], None),
                ("Konstantinas (Kastusis) Kalinauskas", "Кастусь Каліноўскі", ["37,3%", "24,0%", "24,4%", "19,6%"], None),
                ("Svetlana Aleksijevič", "Святлана Алексіевіч", ["18,4%", "13,0%", "12,4%", "10,4%"], None),
            ],
            ["Vilnius\nВільнюс", "Kiti didieji miestai\nІншыя буйныя гарады", "Kitas miestas,\nrajono centras\nІншы горад,\nраённы цэнтр", "Kaimo vietovė\nСельская мясцовасць"],
            top=416,
            row_font=SMALL_STYLE,
            title_style=TITLE_SMALL_STYLE,
            first_col_ratio=0.56,
        )
    )

    for slide in slides:
        c.setFillColor(WHITE)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
        slide(c)
        c.showPage()
    c.save()
    print(f"Written {OUT_PATH}")


if __name__ == "__main__":
    generate_pdf()
