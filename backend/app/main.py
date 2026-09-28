from app.auth.router import router as auth_router
from app.admin.router import router as admin_router
from app.admin.category_router import router as category_router
from app.admin.supplier_router import router as supplier_router
from app.admin.staff_router import router as staff_router
from app.admin.purchase_router import router as purchase_router
from app.admin.supplier_payment_router import router as supplier_payment_router
from app.admin.sales_router import router as sales_router

from fastapi import FastAPI

app = FastAPI()

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(category_router)
app.include_router(supplier_router)
app.include_router(staff_router)
app.include_router(purchase_router)
app.include_router(supplier_payment_router)
app.include_router(sales_router)