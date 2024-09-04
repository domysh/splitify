from dotenv import load_dotenv
load_dotenv()

import uvicorn, socketio
import os, asyncio
from fastapi import FastAPI, HTTPException, Depends, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from jose import jwt
from bson import ObjectId, Binary
from models import *
import uuid, time
from fastapi.middleware.cors import CORSMiddleware

from utils import crypto
from env import DEBUG, CORS_ALLOW, JWT_ALGORITHM, APP_SECRET, JWT_EXPIRE_H
from db import Role, init_db, shutdown_db, User, first_run, Board
from fastapi.responses import FileResponse

redis_mgr = socketio.AsyncRedisManager(
    url="redis://localhost:6379/0" if DEBUG else "redis://redis:6379/0",
)
sio_server = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*", client_manager=redis_mgr)
sio_app = socketio.ASGIApp(sio_server, socketio_path="")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await front_refresh()
    yield
    await shutdown_db()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login", auto_error=False)
app = FastAPI(debug=DEBUG, redoc_url=None, lifespan=lifespan)

@sio_server.on("connect")
async def sio_connect(sid, environ): pass

@sio_server.on("disconnect")
async def sio_disconnect(sid): pass

async def front_refresh(additional:list[str]|None=None):
    await sio_server.emit("update",[] if additional is None else additional)

async def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode["exp"] = int(time.time() + JWT_EXPIRE_H*60*60) #3h
    encoded_jwt = jwt.encode(to_encode, await APP_SECRET(), algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def check_login(token: str = Depends(oauth2_scheme)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, await APP_SECRET(), algorithms=[JWT_ALGORITHM])
        userid: str|None = payload.get("userid", None)
        if not userid:
            return None
        user = await User.find_one(User.id == ObjectId(userid))
    except Exception:
        return None
    return user.role if user else None

def has_role(target:Role|None = None):
    async def func(auth: Role = Depends(check_login)):
        if target is None or auth == Role.admin:
            return True
        if target == Role.guest:
            if not auth is None:
                return True
        if target == Role.editor:
            if auth in [Role.editor, Role.admin]:
                return True
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return func

def mongo_dict_update(base:str, target:dict):
    res = {}
    for k, v in target.items():
        res[base+"."+k] = v
    return res

api = APIRouter(prefix="/api", dependencies=[Depends(has_role())])
editor_api = APIRouter(prefix="/api", dependencies=[Depends(has_role(Role.editor))])
admin_api = APIRouter(prefix="/api", dependencies=[Depends(has_role(Role.admin))])
guest_api = APIRouter(prefix="/api", dependencies=[Depends(has_role(Role.guest))])

@api.post("/login", tags=["auth"])
async def login_api(form: OAuth2PasswordRequestForm = Depends()):
    """Get a login token to use the firegex api"""
    if form.password == "" or form.username == "":
        raise HTTPException(400,"Cannot insert an empty value!")
    await asyncio.sleep(0.3) # No bruteforce :)
    user = await User.find_one(User.username == form.username.lower() )
    if not user:
        raise HTTPException(406,"User not found!")
    if not crypto.verify(form.password, user.password):
        raise HTTPException(406,"Wrong password!")
    return {"access_token": await create_access_token({"userid": user.id.binary.hex(), "role": user.role}), "token_type": "bearer"}

@guest_api.get("/boards", response_model=list[BoardDTO], tags=["board"])
async def get_boards():
    """ Get created boards list and related data """
    return await Board.find_all().to_list()

@editor_api.put("/boards", response_model=IdResponse, tags=["board"])
async def new_board(form: AddBoardForm):
    """ Create a new board """
    board:Board = await Board(**form.model_dump(), categories=[], members=[], products=[]).save()
    await front_refresh()
    return { "id": board.id.binary.hex() }

@editor_api.delete("/boards/{id}", response_model=IdResponse, tags=["board"])
async def remove_board(id: str):
    """ Create a new board """
    await Board.find_one(Board.id == ObjectId(id)).delete_one()
    await front_refresh()
    return { "id": id }

@guest_api.get("/boards/{id}", response_model=BoardDTO, tags=["board"])
async def get_board(id: str):
    """ Get board """
    return await Board.find_one(Board.id == ObjectId(id))

@editor_api.post("/boards/{id}", response_model=IdResponse, tags=["board"])
async def edit_board(id: str, form: AddBoardForm):
    """ Edit board """
    board = await Board.find_one(Board.id == ObjectId(id))
    await board.set(form)
    await front_refresh()
    return { "id": id }

@guest_api.get("/boards/{id}/categories", response_model=list[Category], tags=["category"])
async def get_board_categories(id: str):
    """ Get board category list """
    return (await Board.find_one(Board.id == ObjectId(id))).categories


@editor_api.put("/boards/{id}/categories", response_model=IdResponse, tags=["category"])
async def new_board_categories(id: str, form: AddCategory):
    """ Add a new board category """
    new_id = uuid.uuid4()
    await Board.find_one(Board.id == ObjectId(id)).update_one(
        {"$push": { "categories": Category(**form.model_dump(), id=new_id).model_dump() }}
    )
    await front_refresh()
    return {"id":str(new_id)}

@editor_api.post("/boards/{id}/categories/{category_id}", response_model=IdResponse, tags=["category"])
async def edit_board_categories(id: str, category_id: str, form: AddCategory):
    """ Edit a board category """
    category_id = uuid.UUID(category_id)
    await Board.find_one(Board.id == ObjectId(id)).update_one(
        {"$set": mongo_dict_update("categories.$[cat]", form.model_dump())},
        array_filters=[ {"cat.id": Binary.from_uuid(category_id)}]
    )
    await front_refresh()
    return {"id":str(category_id)}

@editor_api.delete("/boards/{id}/categories/{category_id}", response_model=IdResponse, tags=["category"])
async def delete_board_categories(id: str, category_id: str):
    """ Delete a board category """
    category_id = uuid.UUID(category_id)
    await Board.find_one(Board.id == ObjectId(id)).update_one(
        {"$pull": {
            "categories": { "id": Binary.from_uuid(category_id) },
            "products.$[].categories": Binary.from_uuid(category_id),
            "members.$[].categories": Binary.from_uuid(category_id),
        }}
    )
    await front_refresh()
    return {"id":str(category_id)}

@guest_api.get("/board/{id}/members", response_model=list[Member], tags=["member"])
async def get_board_members(id: str):
    """ Get board member list """
    return (await Board.find_one(Board.id == ObjectId(id))).members

@editor_api.put("/boards/{id}/members", response_model=IdResponse, tags=["member"])
async def new_board_members(id: str, form: AddMember):
    """ Add a new board member """
    new_id = uuid.uuid4()
    await Board.find_one(Board.id == ObjectId(id)).update_one(
        {"$push": { "members": Member(**form.model_dump(), id=new_id).model_dump() }}
    )
    await front_refresh()
    return {"id":str(new_id)}

@editor_api.post("/boards/{id}/members/{member_id}", response_model=IdResponse, tags=["member"])
async def edit_board_members(id: str, member_id: str, form: AddMember):
    """ Edit a board member """
    member_id = uuid.UUID(member_id)
    await Board.find_one(Board.id == ObjectId(id)).update_one(
        {"$set": mongo_dict_update("members.$[memb]", form.model_dump()) },
        array_filters=[ {"memb.id": Binary.from_uuid(member_id)}]
    )
    await front_refresh()
    return {"id":str(member_id)}

@editor_api.delete("/boards/{id}/members/{member_id}", response_model=IdResponse, tags=["member"])
async def delete_board_members(id: str, member_id: str):
    """ Delete a board category """
    member_id = uuid.UUID(member_id)
    await Board.find_one(Board.id == ObjectId(id)).update_one(
        {"$pull": { "members": { "id": Binary.from_uuid(member_id)} }}
    )
    await front_refresh()
    return {"id":str(member_id)}

@guest_api.get("/boards/{id}/products", response_model=list[Product], tags=["product"])
async def get_board_products(id: str):
    """ Get board product list """
    return (await Board.find_one(Board.id == ObjectId(id))).products

@editor_api.put("/boards/{id}/products", response_model=IdResponse, tags=["product"])
async def new_board_products(id: str, form: AddProduct):
    """ Add a new board product """
    new_id = uuid.uuid4()
    await Board.find_one(Board.id == ObjectId(id)).update_one(
        {"$push": { "products": Product(**form.model_dump(), id=new_id).model_dump() }}
    )
    await front_refresh()
    return {"id":str(new_id)}

@editor_api.post("/boards/{id}/products/{product_id}", response_model=IdResponse, tags=["product"])
async def edit_board_products(id: str, product_id: str, form: AddProduct):
    """ Edit a board product """
    product_id = uuid.UUID(product_id)
    await Board.find_one(Board.id == ObjectId(id)).update_one(
        {"$set": mongo_dict_update("products.$[prod]", form.model_dump())},
        array_filters=[ {"prod.id": Binary.from_uuid(product_id)}]
    )
    await front_refresh()
    return {"id":str(product_id)}

@editor_api.delete("/boards/{id}/products/{product_id}", response_model=IdResponse, tags=["product"])
async def delete_board_products(id: str, product_id: str):
    """ Delete a board product """
    product_id = uuid.UUID(product_id)
    await Board.find_one(Board.id == ObjectId(id)).update_one(
        {"$pull": { "products": { "id": Binary.from_uuid(product_id)} }}
    )
    await front_refresh()
    return {"id":str(product_id)}

@admin_api.get("/users", response_model=list[UserDTO], tags=["user"])
async def get_users():
    """ Get users """
    return await User.find_all().to_list()

@admin_api.get("/users/{id}", response_model=UserDTO, tags=["user"])
async def get_user(id: str):
    """ Get user """
    return await User.find_one(User.id == ObjectId(id))

@admin_api.put("/users", response_model=IdResponse, tags=["user"])
async def new_user(form: AddUser):
    """ Add a new user """
    form.username = form.username.lower()
    if form.username == "admin":
        raise HTTPException(
            status_code=400,
            detail="'admin' is reserved"
        )
    if not form.password:
        raise HTTPException(
            status_code=400,
            detail="A password is needed!"
        )
    form.password=crypto.hash(form.password)
    user:User = await User(**form.model_dump()).save()
    await front_refresh()
    return {"id": user.id.binary.hex()}

@admin_api.post("/users/{id}", response_model=IdResponse, tags=["user"])
async def edit_user(id: str, form: AddUser):
    """ Edit a user """
    form.username = form.username.lower()
    if form.username == "admin":
        raise HTTPException(
            status_code=400,
            detail="'admin' is reserved"
        )
    if form.password:
        form.password = crypto.hash(form.password)
    user = await User.find_one(User.id == ObjectId(id))
    await user.set(form)
    await front_refresh()
    return {"id":id}

@admin_api.delete("/users/{id}", response_model=IdResponse, tags=["user"])
async def delete_users(id: str):
    """ Delete a user """
    user = await User.find_one(User.id == ObjectId(id))
    if user.username == "admin":
        raise HTTPException(
            status_code=400,
            detail="'admin' is reserved"
        )
    await User.find_one(User.id == ObjectId(id)).delete_one()
    await front_refresh()
    return {"id":id}

app.include_router(api)
app.include_router(editor_api)
app.include_router(admin_api)
app.include_router(guest_api)

if not DEBUG:
    @app.get("/{full_path:path}", include_in_schema=False)
    async def catch_all(full_path:str):
        file_request = os.path.join("frontend", full_path)
        if not os.path.isfile(file_request):
            return FileResponse("frontend/index.html", media_type='text/html')
        else:
            return FileResponse(file_request)

if DEBUG or CORS_ALLOW:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.mount("/sock", app=sio_app)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.realpath(__file__)))
    asyncio.run(first_run())
    os.environ["TIMEOUT"] = "30"
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8080,
        reload=DEBUG,
        access_log=True,
        workers=3 # If needed more, we need a redis server for socketio
    )
