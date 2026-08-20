from pathlib import Path
import fitz
pdf = Path('attached_assets/1_1787215198265.pdf')
out = Path('.agents/outputs/attached-pdf-pages')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(pdf)
print(f'pages={doc.page_count}')
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    path = out / f'page-{i+1:02d}.png'
    pix.save(path)
    print(path, page.rect)
