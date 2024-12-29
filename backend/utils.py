
from aiocache import cached
from db import Env
import secrets

@cached()
async def APP_SECRET():
    secret = await Env.find_one(Env.key == "APP_SECRET")
    secret = secret.value if secret else None
    if secret is None:
        secret = secrets.token_hex(32)
        await Env(key="APP_SECRET", value=secret).save()
    return secret



