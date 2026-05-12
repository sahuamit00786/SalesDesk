from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


OUTPUT_FILE = "Connexify_Work_Report_May_2026.pdf"


def build_report() -> None:
    doc = SimpleDocTemplate(
        OUTPUT_FILE,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Connexify Work Report",
        author="Connexify Team",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleCustom",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=10,
    )
    h2_style = ParagraphStyle(
        "Heading2Custom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#111827"),
        spaceBefore=8,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyCustom",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=4,
    )
    small_style = ParagraphStyle(
        "SmallCustom",
        parent=styles["BodyText"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4B5563"),
    )

    story = []

    story.append(Paragraph("OCC - Implementation Work Report", title_style))
    story.append(
        Paragraph(
            "Reporting period: 6 May 2026 - 7 May 2026",
            small_style,
        )
    )
    story.append(Spacer(1, 6))

    story.append(Paragraph("Executive Summary", h2_style))
    story.append(
        Paragraph(
            "Nine major improvements were delivered across order processing, pricing, inventory, batch intelligence, "
            "and synchronization automation. The completed work reduces duplicate processing risk, improves operator "
            "control in review flows, strengthens inventory accuracy from Tally, and introduces scalable batch-level "
            "expiry logic powered by shelf-life configuration.",
            body_style,
        )
    )

    story.append(Paragraph("Delivery Breakdown", h2_style))
    breakdown_data = [
        ["Area", "Items Delivered", "Outcome"],
        ["Order Ingestion & Review", "1, 2, 4, 9", "Cleaner pipeline, fewer repeats, better operator control"],
        ["Pricing & Commercial Rules", "3", "Reliable party/SKU pricing persistence and precedence"],
        ["Batch Intelligence & Expiry", "5, 6", "Automated mfg/expiry derivation with configurable shelf life"],
        ["Stock Sync & Automation", "7, 8", "Tally batch stock sync with cron-driven persistence"],
    ]
    table = Table(breakdown_data, colWidths=[52 * mm, 33 * mm, 80 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5E7EB")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#9CA3AF")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Detailed Work Summary", h2_style))
    detailed_items = [
        "Duplicate Order Detection: Added pre-create duplicate checks in the email-to-order pipeline using PO number or a party/date/line-items hash fingerprint. Duplicate candidates are now surfaced in Review with an <b>Already processed</b> badge instead of being re-created.",
        "Editable Quantities in Review: Enabled inline quantity editing in <b>ReviewOrdersModal.tsx</b> before approval. Confirmed edits now flow to <b>order_items</b> inserts so saved orders match operator-confirmed values.",
        "Party Pricing Updates: Wired <b>PartyPricingModal.tsx</b> to upsert party/SKU price changes into pricing storage. <b>tally-fetch-pricing</b> refreshes master prices; party-specific overrides are prioritized during order creation.",
        "Skipped Email Persistence: Introduced <b>status='skipped'</b> on email records. Both <b>gmail-fetch-emails</b> and <b>gmail-process-message</b> now exclude skipped items, preventing re-queue on future sync runs.",
        "Shelf-Life Management: Added a dedicated <b>shelf_life</b> table keyed by <b>base_sku_name</b> with shelf-life months values (default 9 months). Added hook/UI for maintaining shelf-life per base SKU.",
        "Auto Mfg/Expiry Extraction: Added <b>src/lib/batchDateParser.ts</b> with two parsing rules: (A) YYMMDD prefix and (B) letter-month batch codes with inferred year from earliest order. <b>BatchExpiryModal</b> now auto-fills missing Mfg, computes expiry from shelf life, marks updates as dirty/highlighted, and shows inline parsing hints.",
        "Per-Batch Stock from Tally: Added edge function <b>tally-fetch-batch-stock</b> using Stock Summary XML. Parses item/batch/closing qty fields, aggregates across godowns, normalizes names, and upserts <b>batches.quantity_remaining</b> plus <b>skus.current_stock</b> when <b>persist=true</b>. Latest run: 332 rows parsed, 152 batches upserted, 78 SKUs updated, 61 unmatched.",
        "Cron Auto Sync: Added <b>tally_batch_stock_sync</b> scheduling path in cron management and job panel. Calls edge function with <b>{ persist: true }</b>. Cron panel now displays a centered loading spinner until jobs are loaded.",
        "Gmail Receiver Pairing: Updated fetch logic so each configured receiver also includes sent-mail pulls for that exact recipient ordered by time, enabling a full back-and-forth thread instead of inbox-only coverage.",
    ]
    flowable_list = ListFlowable(
        [ListItem(Paragraph(item, body_style), leftIndent=8) for item in detailed_items],
        bulletType="1",
        start="1",
        leftIndent=14,
        bulletFontName="Helvetica-Bold",
        bulletFontSize=9,
        bulletDedent=6,
    )
    story.append(flowable_list)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Operational Impact", h2_style))
    impact_points = [
        "Reduced duplicate order creation and improved auditability in review workflows.",
        "Improved trust in approved orders by matching saved quantities to user-reviewed edits.",
        "Strengthened pricing governance with deterministic override precedence.",
        "Improved stock visibility at batch granularity and automated refresh via cron.",
        "Reduced manual effort in batch expiry maintenance through deterministic parser-based autofill.",
    ]
    story.append(
        ListFlowable(
            [ListItem(Paragraph(p, body_style), leftIndent=8) for p in impact_points],
            bulletType="bullet",
            leftIndent=14,
            bulletFontName="Helvetica",
            bulletFontSize=9,
        )
    )

    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            "Open follow-up: resolve remaining unmatched Tally stock items by filling <b>tally_item_name</b> mappings in the SKUs page.",
            small_style,
        )
    )

    doc.build(story)


if __name__ == "__main__":
    build_report()
