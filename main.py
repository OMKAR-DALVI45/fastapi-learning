from fastapi import FastAPI
from schema import Student
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
import os
app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return FileResponse("static/index.html")

@app.get("/students")
def getItems():
    db = json.load(open("student_data.json",'r',encoding='utf-8-sig')) # reading data from json file
    return db


@app.get("/get_student/{roll}")
def get_student_record(roll: int):
    db = json.load(open("student_data.json",'r',encoding='utf-8-sig'))
    return db[str(roll)]

@app.post("/add_student")
def add_student(obj:Student):
    roll = obj.roll
    name = obj.name
    marks = obj.marks
    address = obj.address
    placed = obj.placed
    db = json.load(open("student_data.json",'r',encoding='utf-8-sig'))
    db[str(roll)] =  {"Name": name, "Marks": marks, "Address": address , "Placed":placed}
    json.dump(db,open("student_data.json","w"),indent=4)
    return db

@app.delete("/delete_student/{roll}")
def delete_student(roll:int):
    db = json.load(open("student_data.json",'r',encoding='utf-8-sig'))  
    record = db.pop(str(roll))
    json.dump(db,open("student_data.json","w"),indent=4)
    return {"Deleted Record":record}

@app.put("/edit_student/{roll}")
def edit_student(roll:int,obj:Student):
    #roll = obj.roll
    name = obj.name
    marks = obj.marks
    address = obj.address
    placed = obj.placed
    db = json.load(open("student_data.json",'r',encoding='utf-8-sig'))
    db[str(roll)] =  {"Name": name, "Marks": marks, "Address": address , "Placed":placed}
    json.dump(db,open("student_data.json","w"),indent=4)
    return {"Student Update Success":db}
