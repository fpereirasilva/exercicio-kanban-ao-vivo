import os
import json
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from azure.storage.blob import BlobServiceClient, ContentSettings

app = FastAPI(
    title="GH-900 Kanban API",
    description="API do Kanban com persistência no Azure Blob Storage e Gestão de Administradores",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Azure Blob Storage Setup
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
CONTAINER_DATA = os.getenv("AZURE_CONTAINER_DATA", "kanbandata")
CONTAINER_IMAGES = os.getenv("AZURE_CONTAINER_IMAGES", "kanbanimages")
BOARD_BLOB_NAME = "kanban-board-state.json"
ADMINS_BLOB_NAME = "admins-list.json"

blob_service_client: Optional[BlobServiceClient] = None

if AZURE_STORAGE_CONNECTION_STRING:
    try:
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    except Exception as e:
        print(f"[Aviso] Nao foi possivel conectar ao Azure Blob Storage: {e}")

# Models
class AdminUser(BaseModel):
    id: Optional[str] = None
    nome: str
    email: str
    cargo: str = "Administrador"
    ativo: bool = True
    criado_em: Optional[str] = None

class AdminCreate(BaseModel):
    nome: str
    email: str
    cargo: str = "Administrador"

class Card(BaseModel):
    id: str
    title: str
    priority: str = "media"
    imageUrl: Optional[str] = None

class Column(BaseModel):
    id: str
    title: str
    cards: List[Card] = []

class BoardState(BaseModel):
    columns: List[Column] = []
    updated_at: Optional[str] = None

# Default Board State
DEFAULT_BOARD = {
    "columns": [
        {
            "id": "col-1",
            "title": "Recebimento / Estoque",
            "cards": [
                {"id": "card-1", "title": "Conferir nota fiscal #1042", "priority": "alta", "imageUrl": None},
                {"id": "card-2", "title": "Organizar lote de laticínios", "priority": "media", "imageUrl": None}
            ]
        },
        {
            "id": "col-2",
            "title": "Em Reposição",
            "cards": [
                {"id": "card-3", "title": "Repor gôndola de grãos", "priority": "baixa", "imageUrl": None}
            ]
        },
        {
            "id": "col-3",
            "title": "Conferência de Preço",
            "cards": []
        },
        {
            "id": "col-4",
            "title": "Concluído",
            "cards": [
                {"id": "card-4", "title": "Treinamento de caixa concluído", "priority": "media", "imageUrl": None}
            ]
        }
    ],
    "updated_at": datetime.now().isoformat()
}

DEFAULT_ADMINS = [
    {
        "id": "admin-1",
        "nome": "Fabio Silva",
        "email": "fsilva@gh900.local",
        "cargo": "Administrador Principal",
        "ativo": True,
        "criado_em": "2026-09-03T20:00:00"
    },
    {
        "id": "admin-2",
        "nome": "Instrutor Azure GH-900",
        "email": "instrutor@gh900.azure.com",
        "cargo": "DevOps & Cloud Engineer",
        "ativo": True,
        "criado_em": "2026-09-03T20:05:00"
    }
]

# Helper functions for Azure Blob Storage
def get_blob_bytes(container: str, blob_name: str) -> Optional[bytes]:
    if not blob_service_client:
        return None
    try:
        container_client = blob_service_client.get_container_client(container)
        if not container_client.exists():
            container_client.create_container(public_access="blob")
        blob_client = container_client.get_blob_client(blob_name)
        if blob_client.exists():
            return blob_client.download_blob().readall()
    except Exception as e:
        print(f"Erro ao ler blob {blob_name} do container {container}: {e}")
    return None

def save_blob_bytes(container: str, blob_name: str, data: bytes, content_type: str = "application/json") -> str:
    if not blob_service_client:
        raise HTTPException(status_code=500, detail="Azure Blob Storage nao configurado")
    try:
        container_client = blob_service_client.get_container_client(container)
        if not container_client.exists():
            container_client.create_container(public_access="blob")
        
        blob_client = container_client.get_blob_client(blob_name)
        content_settings = ContentSettings(content_type=content_type)
        blob_client.upload_blob(data, overwrite=True, content_settings=content_settings)
        return blob_client.url
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar blob no Azure: {str(e)}")

# API Endpoints
@app.get("/api/v1/health")
def health_check():
    blob_status = "conectado" if blob_service_client else "desconectado"
    return {
        "status": "online",
        "service": "GH-900 Kanban API",
        "azure_blob_storage": blob_status,
        "timestamp": datetime.now().isoformat()
    }

# Admin API Endpoints
@app.get("/api/v1/admins", response_model=List[AdminUser])
def list_admins():
    data = get_blob_bytes(CONTAINER_DATA, ADMINS_BLOB_NAME)
    if data:
        try:
            return json.loads(data.decode("utf-8"))
        except Exception:
            pass
    # Initialize default admins if blob doesn't exist
    save_blob_bytes(CONTAINER_DATA, ADMINS_BLOB_NAME, json.dumps(DEFAULT_ADMINS, indent=2).encode("utf-8"))
    return DEFAULT_ADMINS

@app.post("/api/v1/admins", response_model=AdminUser, status_code=210)
def create_admin(admin: AdminCreate):
    admins = list_admins()
    new_admin = {
        "id": f"admin-{uuid.uuid4().hex[:8]}",
        "nome": admin.nome,
        "email": admin.email,
        "cargo": admin.cargo,
        "ativo": True,
        "criado_em": datetime.now().isoformat()
    }
    admins.append(new_admin)
    save_blob_bytes(CONTAINER_DATA, ADMINS_BLOB_NAME, json.dumps(admins, indent=2).encode("utf-8"))
    return new_admin

@app.delete("/api/v1/admins/{admin_id}")
def delete_admin(admin_id: str):
    admins = list_admins()
    updated_admins = [a for a in admins if a.get("id") != admin_id]
    if len(updated_admins) == len(admins):
        raise HTTPException(status_code=404, detail="Administrador nao encontrado")
    save_blob_bytes(CONTAINER_DATA, ADMINS_BLOB_NAME, json.dumps(updated_admins, indent=2).encode("utf-8"))
    return {"message": "Administrador removido com sucesso", "id": admin_id}

# Board API Endpoints
@app.get("/api/v1/board")
def get_board():
    data = get_blob_bytes(CONTAINER_DATA, BOARD_BLOB_NAME)
    if data:
        try:
            return json.loads(data.decode("utf-8"))
        except Exception:
            pass
    # Save default board state to blob storage if not present
    save_blob_bytes(CONTAINER_DATA, BOARD_BLOB_NAME, json.dumps(DEFAULT_BOARD, indent=2).encode("utf-8"))
    return DEFAULT_BOARD

@app.post("/api/v1/board")
def save_board(board: BoardState):
    board_dict = board.dict()
    board_dict["updated_at"] = datetime.now().isoformat()
    url = save_blob_bytes(CONTAINER_DATA, BOARD_BLOB_NAME, json.dumps(board_dict, indent=2).encode("utf-8"))
    return {"message": "Quadro Kanban salvo com sucesso no Azure Blob Storage", "url": url, "updated_at": board_dict["updated_at"]}

# Image Upload API Endpoint (Container: kanbanimages)
@app.post("/api/v1/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    unique_filename = f"img_{uuid.uuid4().hex}{ext}"
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    
    blob_url = save_blob_bytes(CONTAINER_IMAGES, unique_filename, content, content_type=content_type)
    return {
        "filename": unique_filename,
        "original_name": file.filename,
        "url": blob_url,
        "container": CONTAINER_IMAGES
    }
