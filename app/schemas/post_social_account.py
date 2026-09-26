from pydantic import BaseModel
from typing import List


class ConnectSocialAccountsRequest(BaseModel):
    social_account_ids: List[int]