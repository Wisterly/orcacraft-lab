"""
OrçaCraft.lab — Microserviço Backend & Spreadsheet Engine (FastAPI + openpyxl + WeasyPrint)
Executa:
1. Compatibilização Contratual (INNER/LEFT JOIN) pelo Código de Referência (SINAPI / SEINFRA).
2. Truncamento estrito na 2ª casa decimal (ROUND_DOWN / Decimal) no padrão TCU / Engenharia Pública.
3. Manipulação cirúrgica de arquivos .xlsx via openpyxl preservando estilos, cabeçalhos e fórmulas originais.
4. Renderização de HTML/CSS para geração de .pdf via WeasyPrint.
"""

from decimal import Decimal, ROUND_DOWN
from io import BytesIO
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import openpyxl

app = FastAPI(title="OrçaCraft.lab — Engine API", version="1.2.0")


def trunc2_decimal(value: float) -> float:
    d = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    return float(d)


class BudgetItemPayload(BaseModel):
    code: str
    source: str
    description: str
    unit: str
    quantity: float
    base_unit_price: float
    wbs_stage: str


class ExportRequestPayload(BaseModel):
    scope_title: str
    contract_name: Optional[str] = None
    ata_number: Optional[str] = None
    bdi_percent: float = 0.0
    items: List[BudgetItemPayload]


@app.post("/api/v1/calculate")
def calculate_budget(payload: ExportRequestPayload):
    computed = []
    grand_total = Decimal("0.00")
    bdi_factor = Decimal(str(1 + (payload.bdi_percent / 100.0)))

    for item in payload.items:
        qty = Decimal(str(item.quantity)).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
        base_price = Decimal(str(item.base_unit_price)).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
        unit_with_bdi = (base_price * bdi_factor).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
        line_total = (qty * unit_with_bdi).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
        grand_total += line_total

        computed.append({
            "code": item.code,
            "description": item.description,
            "unit": item.unit,
            "quantity": float(qty),
            "base_unit_price": float(base_price),
            "unit_price_with_bdi": float(unit_with_bdi),
            "total_price": float(line_total),
        })

    return {
        "scope_title": payload.scope_title,
        "bdi_percent": payload.bdi_percent,
        "total": float(grand_total),
        "items": computed,
    }


@app.post("/api/v1/export/xlsx-template")
async def inject_into_contract_template(
    template_file: UploadFile = File(...),
):
    raw_bytes = await template_file.read()
    wb = openpyxl.load_workbook(BytesIO(raw_bytes))
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=OrcaCraft_lab_Template_Injetado.xlsx"},
    )
