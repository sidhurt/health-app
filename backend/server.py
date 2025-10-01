from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="FitTrack - Fitness Journey Tracker", description="AI-powered fitness tracking app")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Data Models
class NutrientInfo(BaseModel):
    name: str
    amount: float
    unit: str

class MacroNutrients(BaseModel):
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbohydrates: Optional[float] = None
    fat: Optional[float] = None
    fiber: Optional[float] = None
    sugar: Optional[float] = None
    sodium: Optional[float] = None

class Exercise(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    type: str  # strength, cardio, flexibility
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight: Optional[float] = None
    duration: Optional[int] = None  # minutes
    distance: Optional[float] = None  # km
    calories_burned: Optional[float] = None
    notes: Optional[str] = None
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExerciseCreate(BaseModel):
    name: str
    type: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    weight: Optional[float] = None
    duration: Optional[int] = None
    distance: Optional[float] = None
    calories_burned: Optional[float] = None
    notes: Optional[str] = None

class FoodEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    food_name: str
    serving_size: float
    serving_unit: str
    macros: MacroNutrients
    meal_type: str  # breakfast, lunch, dinner, snack
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FoodEntryCreate(BaseModel):
    food_name: str
    serving_size: float
    serving_unit: str
    macros: MacroNutrients
    meal_type: str

class Goal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # weight_loss, muscle_gain, endurance, strength
    target_value: float
    current_value: float
    unit: str
    target_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class GoalCreate(BaseModel):
    type: str
    target_value: float
    current_value: float
    unit: str
    target_date: datetime

class AIInsightRequest(BaseModel):
    request_type: str  # workout_recommendation, nutrition_advice, progress_analysis
    user_data: Dict[str, Any]

class ProgressEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    metric_type: str  # weight, body_fat, muscle_mass
    value: float
    unit: str
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProgressCreate(BaseModel):
    metric_type: str
    value: float
    unit: str

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# AI Service
async def get_ai_insights(request: AIInsightRequest) -> Dict[str, Any]:
    """Generate AI-powered fitness insights using OpenAI"""
    try:
        # Initialize LLM Chat with emergent key
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"fitness_ai_{uuid.uuid4()}",
            system_message="You are an expert fitness and nutrition advisor. Provide helpful, personalized advice based on user data. Keep responses concise and actionable."
        ).with_model("openai", "gpt-4o-mini")
        
        # Create context-specific prompt
        if request.request_type == "workout_recommendation":
            prompt = f"""Based on this fitness data, recommend a personalized workout plan:
            Recent Exercises: {request.user_data.get('recent_exercises', [])}
            Goals: {request.user_data.get('goals', [])}
            Current Progress: {request.user_data.get('progress', {})}
            
            Provide 3-5 specific exercise recommendations with sets/reps/duration."""
            
        elif request.request_type == "nutrition_advice":
            prompt = f"""Based on this nutrition data, provide personalized dietary advice:
            Recent Meals: {request.user_data.get('recent_nutrition', [])}
            Goals: {request.user_data.get('goals', [])}
            Current Progress: {request.user_data.get('progress', {})}
            
            Suggest meal improvements and macro adjustments."""
            
        elif request.request_type == "progress_analysis":
            prompt = f"""Analyze this fitness progress data and provide insights:
            Exercise History: {request.user_data.get('exercise_history', [])}
            Nutrition History: {request.user_data.get('nutrition_history', [])}
            Progress Metrics: {request.user_data.get('progress_metrics', [])}
            Goals: {request.user_data.get('goals', [])}
            
            Highlight trends, achievements, and areas for improvement."""
            
        else:
            prompt = f"Provide general fitness advice based on this data: {request.user_data}"
        
        # Send message to AI
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "type": request.request_type,
            "advice": response,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"AI insight generation failed: {e}")
        return {
            "type": request.request_type,
            "advice": "Unable to generate AI insights at this time. Please try again later.",
            "error": True,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

# Simple auth (for MVP - in production use proper JWT)
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    # For MVP, we'll use the token as user_id directly
    # In production, validate JWT and extract user_id
    return credentials.credentials or "demo_user"

# Exercise Endpoints
@api_router.post("/exercises", response_model=Exercise)
async def create_exercise(
    exercise: ExerciseCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new exercise entry"""
    exercise_data = exercise.dict()
    exercise_data["user_id"] = user_id
    exercise_obj = Exercise(**exercise_data)
    
    # Store in MongoDB
    await db.exercises.insert_one(exercise_obj.dict())
    return exercise_obj

@api_router.get("/exercises", response_model=List[Exercise])
async def get_exercises(
    user_id: str = Depends(get_current_user),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """Get user's exercise history"""
    exercises = await db.exercises.find(
        {"user_id": user_id}
    ).sort("date", -1).skip(offset).limit(limit).to_list(limit)
    
    return [Exercise(**exercise) for exercise in exercises]

# Nutrition Endpoints
@api_router.post("/nutrition", response_model=FoodEntry)
async def create_food_entry(
    food_entry: FoodEntryCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new food entry"""
    food_data = food_entry.dict()
    food_data["user_id"] = user_id
    food_obj = FoodEntry(**food_data)
    
    # Store in MongoDB
    await db.food_entries.insert_one(food_obj.dict())
    return food_obj

@api_router.get("/nutrition", response_model=List[FoodEntry])
async def get_nutrition_entries(
    user_id: str = Depends(get_current_user),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """Get user's nutrition history"""
    entries = await db.food_entries.find(
        {"user_id": user_id}
    ).sort("date", -1).skip(offset).limit(limit).to_list(limit)
    
    return [FoodEntry(**entry) for entry in entries]

@api_router.get("/nutrition/search")
async def search_foods(query: str = Query(..., min_length=2)):
    """Search for foods (simplified nutrition database)"""
    # Simplified food database for MVP
    foods = [
        {"name": "Chicken Breast", "calories_per_100g": 165, "protein": 31, "carbs": 0, "fat": 3.6},
        {"name": "Brown Rice", "calories_per_100g": 112, "protein": 2.6, "carbs": 23, "fat": 0.9},
        {"name": "Broccoli", "calories_per_100g": 34, "protein": 2.8, "carbs": 7, "fat": 0.4},
        {"name": "Salmon", "calories_per_100g": 208, "protein": 25, "carbs": 0, "fat": 12},
        {"name": "Sweet Potato", "calories_per_100g": 86, "protein": 1.6, "carbs": 20, "fat": 0.1},
        {"name": "Oats", "calories_per_100g": 389, "protein": 16.9, "carbs": 66.3, "fat": 6.9},
        {"name": "Banana", "calories_per_100g": 89, "protein": 1.1, "carbs": 23, "fat": 0.3},
        {"name": "Greek Yogurt", "calories_per_100g": 59, "protein": 10, "carbs": 3.6, "fat": 0.4},
        {"name": "Almonds", "calories_per_100g": 579, "protein": 21.2, "carbs": 21.6, "fat": 49.9},
        {"name": "Eggs", "calories_per_100g": 155, "protein": 13, "carbs": 1.1, "fat": 11}
    ]
    
    # Filter foods based on query
    filtered_foods = [
        food for food in foods 
        if query.lower() in food["name"].lower()
    ]
    
    return filtered_foods[:10]  # Return top 10 matches

# Goals Endpoints
@api_router.post("/goals", response_model=Goal)
async def create_goal(
    goal: GoalCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new fitness goal"""
    goal_data = goal.dict()
    goal_data["user_id"] = user_id
    goal_obj = Goal(**goal_data)
    
    await db.goals.insert_one(goal_obj.dict())
    return goal_obj

@api_router.get("/goals", response_model=List[Goal])
async def get_goals(
    user_id: str = Depends(get_current_user),
    active_only: bool = Query(True)
):
    """Get user's goals"""
    filter_criteria = {"user_id": user_id}
    if active_only:
        filter_criteria["is_active"] = True
    
    goals = await db.goals.find(filter_criteria).to_list(100)
    return [Goal(**goal) for goal in goals]

# Progress Tracking Endpoints
@api_router.post("/progress", response_model=ProgressEntry)
async def create_progress_entry(
    progress: ProgressCreate,
    user_id: str = Depends(get_current_user)
):
    """Create a new progress entry"""
    progress_data = progress.dict()
    progress_data["user_id"] = user_id
    progress_obj = ProgressEntry(**progress_data)
    
    await db.progress.insert_one(progress_obj.dict())
    return progress_obj

@api_router.get("/progress", response_model=List[ProgressEntry])
async def get_progress(
    user_id: str = Depends(get_current_user),
    metric_type: Optional[str] = Query(None)
):
    """Get user's progress data"""
    filter_criteria = {"user_id": user_id}
    if metric_type:
        filter_criteria["metric_type"] = metric_type
    
    progress = await db.progress.find(filter_criteria).sort("date", -1).to_list(100)
    return [ProgressEntry(**entry) for entry in progress]

# AI Insights Endpoint
@api_router.post("/ai/insights")
async def get_insights(
    request: AIInsightRequest,
    user_id: str = Depends(get_current_user)
):
    """Get AI-powered fitness insights"""
    # Add user_id to the request data
    request.user_data["user_id"] = user_id
    
    insights = await get_ai_insights(request)
    
    # Store the insight in database for future reference
    await db.ai_insights.insert_one({
        "user_id": user_id,
        "type": request.request_type,
        "insights": insights,
        "created_at": datetime.now(timezone.utc)
    })
    
    return insights

# Dashboard Analytics
@api_router.get("/dashboard")
async def get_dashboard_data(user_id: str = Depends(get_current_user)):
    """Get comprehensive dashboard data"""
    # Get recent exercises
    recent_exercises = await db.exercises.find(
        {"user_id": user_id}
    ).sort("date", -1).limit(5).to_list(5)
    
    # Get recent nutrition
    recent_nutrition = await db.food_entries.find(
        {"user_id": user_id}
    ).sort("date", -1).limit(10).to_list(10)
    
    # Get active goals
    active_goals = await db.goals.find(
        {"user_id": user_id, "is_active": True}
    ).to_list(10)
    
    # Get recent progress
    recent_progress = await db.progress.find(
        {"user_id": user_id}
    ).sort("date", -1).limit(10).to_list(10)
    
    # Calculate daily totals for nutrition
    today = datetime.now(timezone.utc).date()
    today_nutrition = await db.food_entries.find(
        {
            "user_id": user_id,
            "date": {
                "$gte": datetime.combine(today, datetime.min.time().replace(tzinfo=timezone.utc)),
                "$lt": datetime.combine(today, datetime.max.time().replace(tzinfo=timezone.utc))
            }
        }
    ).to_list(100)
    
    daily_macros = {
        "calories": sum(entry.get("macros", {}).get("calories", 0) for entry in today_nutrition),
        "protein": sum(entry.get("macros", {}).get("protein", 0) for entry in today_nutrition),
        "carbs": sum(entry.get("macros", {}).get("carbohydrates", 0) for entry in today_nutrition),
        "fat": sum(entry.get("macros", {}).get("fat", 0) for entry in today_nutrition)
    }
    
    return {
        "recent_exercises": recent_exercises,
        "recent_nutrition": recent_nutrition,
        "active_goals": active_goals,
        "recent_progress": recent_progress,
        "daily_macros": daily_macros,
        "dashboard_generated_at": datetime.now(timezone.utc).isoformat()
    }

# Original demo endpoints
@api_router.get("/")
async def root():
    return {"message": "FitTrack API - Your AI-Powered Fitness Journey Tracker"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()