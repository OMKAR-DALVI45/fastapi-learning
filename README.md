# FastAPI Learning

A student records app I built while learning FastAPI. It covers the basics of
building a REST API: GET, POST, PUT and DELETE endpoints, Pydantic models for
request validation, reading and writing data in a JSON file, and serving a
static HTML page.

## Endpoints
- GET /students: list all students
- GET /get_student/{roll}: get one student by roll number
- POST /add_student: add a student
- PUT /edit_student/{roll}: update a student
- DELETE /delete_student/{roll}: delete a student
- GET /: simple HTML page

## Run
pip install -r requirements.txt
uvicorn main:app --reload

Then open http://127.0.0.1:8000/docs to try the endpoints.
