import fitz
from pathlib import Path
src = Path('attached_assets/7_1787221335626.pdf')
out = Path('.agents/outputs/attached-pdf-pages')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(src)
for index, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    path = out / f'page-{index+1}.png'
    pix.save(path)
    print(path, page.rect, pix.width, pix.height)
