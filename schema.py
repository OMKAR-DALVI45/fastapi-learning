from pydantic import BaseModel
class Student(BaseModel):
    roll:int
    name:str
    marks:int
    address:str
    placed:bool