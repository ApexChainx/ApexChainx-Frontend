from pydantic import BaseModel, Field
from typing import Optional

class Ticket(BaseModel):
    title: str = Field(..., example="Concert Ticket")
    price: float = Field(..., gt=0, example=100.50)
    description: Optional[str] = Field(None, example="Front row seat")
