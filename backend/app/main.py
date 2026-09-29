from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.admin.router import router as admin_router
from app.admin.category_router import router as category_router
from app.admin.supplier_router import router as supplier_router
from app.admin.staff_router import router as staff_router
from app.admin.purchase_router import router as purchase_router
from app.admin.supplier_payment_router import router as supplier_payment_router
from app.admin.sales_router import router as sales_router
from app.admin.ledger_router import router as ledger_router
from app.admin.report_router import router as report_router


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(category_router)
app.include_router(supplier_router)
app.include_router(staff_router)
app.include_router(purchase_router)
app.include_router(supplier_payment_router)
app.include_router(sales_router)
app.include_router(ledger_router)
app.include_router(report_router)