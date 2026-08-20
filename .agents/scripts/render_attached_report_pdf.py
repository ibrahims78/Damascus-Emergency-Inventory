from pathlib import Path
import fitz

source = Path("attached_assets/1_1787213765796.pdf")
output_dir = Path(".agents/outputs/attached-report-pdf")
output_dir.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print(f"pages={document.page_count}")
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    output = output_dir / f"page-{index + 1:02d}.png"
    pixmap.save(output)
    print(f"rendered={output} size={page.rect.width:.0f}x{page.rect.height:.0f}")