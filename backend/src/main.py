from fastapi import FastAPI, File, UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import io


app = FastAPI()

# MongoDB Configuration
MONGO_URL = "mongodb+srv://ahnaf:robofication@meeting-notes.pb8n1.mongodb.net/?retryWrites=true&w=majority&appName=meeting-notes"
client = AsyncIOMotorClient(MONGO_URL)
db = client["audioDB"]
audio_collection = db["audioFiles"]

# Model for response
class AudioFile(BaseModel):
    id: str
    filename: str
    content_type: str


@app.post("/upload-audio", response_model=AudioFile)
async def upload_audio(audioFile: UploadFile = File(...)):
    try:
        # Read file content
        file_content = await audioFile.read()

        # Save file in MongoDB
        result = await audio_collection.insert_one({
            "filename": audioFile.filename,
            "content_type": audioFile.content_type,
            "data": file_content,
        })

        return {
            "id": str(result.inserted_id),
            "filename": audioFile.filename,
            "content_type": audioFile.content_type,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading audio file: {e}")


@app.get("/audio/{audio_id}")
async def get_audio(audio_id: str):
    try:
        # Fetch the audio file from MongoDB
        audio = await audio_collection.find_one({"_id": audio_id})

        if not audio:
            raise HTTPException(status_code=404, detail="Audio file not found")

        # Stream the audio back
        return StreamingResponse(
            io.BytesIO(audio["data"]),
            media_type=audio["content_type"],
            headers={"Content-Disposition": f"attachment; filename={audio['filename']}"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving audio file: {e}")
