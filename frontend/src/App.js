import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Textarea } from './components/ui/textarea';
import { Calendar } from './components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { CalendarIcon, Dumbbell, Apple, Target, TrendingUp, Brain, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Mock user token for MVP (in production, use proper authentication)
const USER_TOKEN = "demo_user_123";

const authHeaders = {
  'Authorization': `Bearer ${USER_TOKEN}`,
  'Content-Type': 'application/json'
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Exercise state
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    type: 'strength',
    sets: '',
    reps: '',
    weight: '',
    duration: '',
    distance: '',
    calories_burned: '',
    notes: ''
  });
  
  // Nutrition state
  const [nutritionForm, setNutritionForm] = useState({
    food_name: '',
    serving_size: '',
    serving_unit: 'g',
    meal_type: 'breakfast',
    macros: {
      calories: '',
      protein: '',
      carbohydrates: '',
      fat: ''
    }
  });
  
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [foodSearchResults, setFoodSearchResults] = useState([]);
  
  // Goals state
  const [goalForm, setGoalForm] = useState({
    type: 'weight_loss',
    target_value: '',
    current_value: '',
    unit: 'kg',
    target_date: null
  });
  
  // Progress state
  const [progressForm, setProgressForm] = useState({
    metric_type: 'weight',
    value: '',
    unit: 'kg'
  });
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState('');
  const [insightType, setInsightType] = useState('workout_recommendation');

  // Load dashboard data
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/dashboard`, { headers: authHeaders });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Search foods
  const searchFoods = async () => {
    if (!foodSearchQuery.trim()) return;
    
    try {
      const response = await axios.get(`${API}/nutrition/search?query=${foodSearchQuery}`);
      setFoodSearchResults(response.data);
    } catch (error) {
      console.error('Error searching foods:', error);
      toast.error('Failed to search foods');
    }
  };

  // Select food from search results
  const selectFood = (food) => {
    setNutritionForm(prev => ({
      ...prev,
      food_name: food.name,
      macros: {
        calories: food.calories_per_100g,
        protein: food.protein,
        carbohydrates: food.carbs,
        fat: food.fat
      }
    }));
    setFoodSearchResults([]);
    setFoodSearchQuery('');
  };

  // Submit exercise
  const submitExercise = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Clean up form data
      const exerciseData = { ...exerciseForm };
      Object.keys(exerciseData).forEach(key => {
        if (exerciseData[key] === '' || exerciseData[key] === null) {
          delete exerciseData[key];
        } else if (['sets', 'reps', 'weight', 'duration', 'distance', 'calories_burned'].includes(key)) {
          exerciseData[key] = parseFloat(exerciseData[key]);
        }
      });
      
      await axios.post(`${API}/exercises`, exerciseData, { headers: authHeaders });
      toast.success('Exercise logged successfully!');
      
      // Reset form
      setExerciseForm({
        name: '',
        type: 'strength',
        sets: '',
        reps: '',
        weight: '',
        duration: '',
        distance: '',
        calories_burned: '',
        notes: ''
      });
      
      loadDashboard(); // Refresh dashboard
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Failed to log exercise');
    } finally {
      setLoading(false);
    }
  };

  // Submit nutrition
  const submitNutrition = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const nutritionData = {
        ...nutritionForm,
        serving_size: parseFloat(nutritionForm.serving_size),
        macros: {
          ...nutritionForm.macros,
          calories: parseFloat(nutritionForm.macros.calories || 0),
          protein: parseFloat(nutritionForm.macros.protein || 0),
          carbohydrates: parseFloat(nutritionForm.macros.carbohydrates || 0),
          fat: parseFloat(nutritionForm.macros.fat || 0)
        }
      };
      
      await axios.post(`${API}/nutrition`, nutritionData, { headers: authHeaders });
      toast.success('Food logged successfully!');
      
      // Reset form
      setNutritionForm({
        food_name: '',
        serving_size: '',
        serving_unit: 'g',
        meal_type: 'breakfast',
        macros: {
          calories: '',
          protein: '',
          carbohydrates: '',
          fat: ''
        }
      });
      
      loadDashboard(); // Refresh dashboard
    } catch (error) {
      console.error('Error submitting nutrition:', error);
      toast.error('Failed to log food');
    } finally {
      setLoading(false);
    }
  };

  // Submit goal
  const submitGoal = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const goalData = {
        ...goalForm,
        target_value: parseFloat(goalForm.target_value),
        current_value: parseFloat(goalForm.current_value),
        target_date: goalForm.target_date?.toISOString()
      };
      
      await axios.post(`${API}/goals`, goalData, { headers: authHeaders });
      toast.success('Goal created successfully!');
      
      // Reset form
      setGoalForm({
        type: 'weight_loss',
        target_value: '',
        current_value: '',
        unit: 'kg',
        target_date: null
      });
      
      loadDashboard(); // Refresh dashboard
    } catch (error) {
      console.error('Error submitting goal:', error);
      toast.error('Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  // Submit progress
  const submitProgress = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const progressData = {
        ...progressForm,
        value: parseFloat(progressForm.value)
      };
      
      await axios.post(`${API}/progress`, progressData, { headers: authHeaders });
      toast.success('Progress logged successfully!');
      
      // Reset form
      setProgressForm({
        metric_type: 'weight',
        value: '',
        unit: 'kg'
      });
      
      loadDashboard(); // Refresh dashboard
    } catch (error) {
      console.error('Error submitting progress:', error);
      toast.error('Failed to log progress');
    } finally {
      setLoading(false);
    }
  };

  // Get AI insights
  const getAiInsights = async () => {
    try {
      setLoading(true);
      
      const requestData = {
        request_type: insightType,
        user_data: {
          recent_exercises: dashboardData?.recent_exercises || [],
          recent_nutrition: dashboardData?.recent_nutrition || [],
          goals: dashboardData?.active_goals || [],
          progress: dashboardData?.recent_progress || []
        }
      };
      
      const response = await axios.post(`${API}/ai/insights`, requestData, { headers: authHeaders });
      setAiInsights(response.data.advice);
      toast.success('AI insights generated!');
    } catch (error) {
      console.error('Error getting AI insights:', error);
      toast.error('Failed to generate AI insights');
      setAiInsights('Unable to generate insights at this time. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 font-['Space_Grotesk']">
            FitTrack
          </h1>
          <p className="text-slate-400 text-lg">Your AI-powered fitness journey tracker</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 border-slate-700">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="exercise" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Dumbbell className="w-4 h-4 mr-2" />
              Exercise
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Apple className="w-4 h-4 mr-2" />
              Nutrition
            </TabsTrigger>
            <TabsTrigger value="goals" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Target className="w-4 h-4 mr-2" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Brain className="w-4 h-4 mr-2" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Daily Macros */}
              {dashboardData?.daily_macros && (
                <>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-300">Calories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {Math.round(dashboardData.daily_macros.calories)}
                      </div>
                      <Progress value={Math.min((dashboardData.daily_macros.calories / 2000) * 100, 100)} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-300">Protein</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {Math.round(dashboardData.daily_macros.protein)}g
                      </div>
                      <Progress value={Math.min((dashboardData.daily_macros.protein / 150) * 100, 100)} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-300">Carbs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {Math.round(dashboardData.daily_macros.carbs)}g
                      </div>
                      <Progress value={Math.min((dashboardData.daily_macros.carbs / 250) * 100, 100)} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-300">Fat</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {Math.round(dashboardData.daily_macros.fat)}g
                      </div>
                      <Progress value={Math.min((dashboardData.daily_macros.fat / 65) * 100, 100)} className="mt-2" />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Exercises */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Exercises</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData?.recent_exercises?.length > 0 ? (
                      dashboardData.recent_exercises.slice(0, 5).map((exercise, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-white">{exercise.name}</p>
                            <p className="text-sm text-slate-400">
                              {exercise.type} • {new Date(exercise.date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-emerald-500 text-emerald-400">
                            {exercise.sets ? `${exercise.sets}x${exercise.reps}` : 
                             exercise.duration ? `${exercise.duration}min` : 'Logged'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-4">No exercises logged yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Active Goals */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Active Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData?.active_goals?.length > 0 ? (
                      dashboardData.active_goals.map((goal, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="font-medium text-white capitalize">{goal.type.replace('_', ' ')}</p>
                            <Badge variant="outline" className="border-blue-500 text-blue-400">
                              {goal.current_value}/{goal.target_value} {goal.unit}
                            </Badge>
                          </div>
                          <Progress 
                            value={Math.min((goal.current_value / goal.target_value) * 100, 100)} 
                            className="mt-1"
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-4">No active goals set</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Exercise Tab */}
          <TabsContent value="exercise" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Log Exercise</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitExercise} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="exercise-name" className="text-slate-300">Exercise Name</Label>
                      <Input
                        id="exercise-name"
                        value={exerciseForm.name}
                        onChange={(e) => setExerciseForm(prev => ({...prev, name: e.target.value}))}
                        placeholder="e.g., Push-ups, Running, Squats"
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="exercise-type" className="text-slate-300">Type</Label>
                      <Select 
                        value={exerciseForm.type} 
                        onValueChange={(value) => setExerciseForm(prev => ({...prev, type: value}))}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="strength">Strength</SelectItem>
                          <SelectItem value="cardio">Cardio</SelectItem>
                          <SelectItem value="flexibility">Flexibility</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {exerciseForm.type === 'strength' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="sets" className="text-slate-300">Sets</Label>
                        <Input
                          id="sets"
                          type="number"
                          value={exerciseForm.sets}
                          onChange={(e) => setExerciseForm(prev => ({...prev, sets: e.target.value}))}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reps" className="text-slate-300">Reps</Label>
                        <Input
                          id="reps"
                          type="number"
                          value={exerciseForm.reps}
                          onChange={(e) => setExerciseForm(prev => ({...prev, reps: e.target.value}))}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="weight" className="text-slate-300">Weight (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          value={exerciseForm.weight}
                          onChange={(e) => setExerciseForm(prev => ({...prev, weight: e.target.value}))}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                  )}

                  {exerciseForm.type === 'cardio' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="duration" className="text-slate-300">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={exerciseForm.duration}
                          onChange={(e) => setExerciseForm(prev => ({...prev, duration: e.target.value}))}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="distance" className="text-slate-300">Distance (km)</Label>
                        <Input
                          id="distance"
                          type="number"
                          step="0.1"
                          value={exerciseForm.distance}
                          onChange={(e) => setExerciseForm(prev => ({...prev, distance: e.target.value}))}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="calories" className="text-slate-300">Calories Burned</Label>
                      <Input
                        id="calories"
                        type="number"
                        value={exerciseForm.calories_burned}
                        onChange={(e) => setExerciseForm(prev => ({...prev, calories_burned: e.target.value}))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-slate-300">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={exerciseForm.notes}
                      onChange={(e) => setExerciseForm(prev => ({...prev, notes: e.target.value}))}
                      placeholder="How did the exercise feel? Any observations?"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Log Exercise
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Log Food</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Food Search */}
                <div className="mb-6">
                  <Label htmlFor="food-search" className="text-slate-300">Search Foods</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="food-search"
                      value={foodSearchQuery}
                      onChange={(e) => setFoodSearchQuery(e.target.value)}
                      placeholder="Search for foods..."
                      className="bg-slate-700 border-slate-600 text-white"
                      onKeyPress={(e) => e.key === 'Enter' && searchFoods()}
                    />
                    <Button onClick={searchFoods} variant="outline" className="border-slate-600">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {foodSearchResults.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {foodSearchResults.map((food, index) => (
                        <div 
                          key={index}
                          onClick={() => selectFood(food)}
                          className="p-3 bg-slate-700 border border-slate-600 rounded-md cursor-pointer hover:bg-slate-600 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-white font-medium">{food.name}</span>
                            <span className="text-slate-400 text-sm">{food.calories_per_100g} cal/100g</span>
                          </div>
                          <div className="text-slate-400 text-sm mt-1">
                            P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={submitNutrition} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="food-name" className="text-slate-300">Food Name</Label>
                      <Input
                        id="food-name"
                        value={nutritionForm.food_name}
                        onChange={(e) => setNutritionForm(prev => ({...prev, food_name: e.target.value}))}
                        placeholder="e.g., Chicken Breast"
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="meal-type" className="text-slate-300">Meal Type</Label>
                      <Select 
                        value={nutritionForm.meal_type} 
                        onValueChange={(value) => setNutritionForm(prev => ({...prev, meal_type: value}))}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="breakfast">Breakfast</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Dinner</SelectItem>
                          <SelectItem value="snack">Snack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="serving-size" className="text-slate-300">Serving Size</Label>
                      <Input
                        id="serving-size"
                        type="number"
                        step="0.1"
                        value={nutritionForm.serving_size}
                        onChange={(e) => setNutritionForm(prev => ({...prev, serving_size: e.target.value}))}
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="serving-unit" className="text-slate-300">Unit</Label>
                      <Select 
                        value={nutritionForm.serving_unit} 
                        onValueChange={(value) => setNutritionForm(prev => ({...prev, serving_unit: value}))}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="g">grams</SelectItem>
                          <SelectItem value="oz">ounces</SelectItem>
                          <SelectItem value="cup">cups</SelectItem>
                          <SelectItem value="piece">pieces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="calories" className="text-slate-300">Calories</Label>
                      <Input
                        id="calories"
                        type="number"
                        step="0.1"
                        value={nutritionForm.macros.calories}
                        onChange={(e) => setNutritionForm(prev => ({
                          ...prev, 
                          macros: {...prev.macros, calories: e.target.value}
                        }))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="protein" className="text-slate-300">Protein (g)</Label>
                      <Input
                        id="protein"
                        type="number"
                        step="0.1"
                        value={nutritionForm.macros.protein}
                        onChange={(e) => setNutritionForm(prev => ({
                          ...prev, 
                          macros: {...prev.macros, protein: e.target.value}
                        }))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="carbs" className="text-slate-300">Carbs (g)</Label>
                      <Input
                        id="carbs"
                        type="number"
                        step="0.1"
                        value={nutritionForm.macros.carbohydrates}
                        onChange={(e) => setNutritionForm(prev => ({
                          ...prev, 
                          macros: {...prev.macros, carbohydrates: e.target.value}
                        }))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fat" className="text-slate-300">Fat (g)</Label>
                      <Input
                        id="fat"
                        type="number"
                        step="0.1"
                        value={nutritionForm.macros.fat}
                        onChange={(e) => setNutritionForm(prev => ({
                          ...prev, 
                          macros: {...prev.macros, fat: e.target.value}
                        }))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Log Food
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Create Goal</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitGoal} className="space-y-4">
                    <div>
                      <Label htmlFor="goal-type" className="text-slate-300">Goal Type</Label>
                      <Select 
                        value={goalForm.type} 
                        onValueChange={(value) => setGoalForm(prev => ({...prev, type: value}))}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="weight_loss">Weight Loss</SelectItem>
                          <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                          <SelectItem value="endurance">Endurance</SelectItem>
                          <SelectItem value="strength">Strength</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="current-value" className="text-slate-300">Current Value</Label>
                        <Input
                          id="current-value"
                          type="number"
                          step="0.1"
                          value={goalForm.current_value}
                          onChange={(e) => setGoalForm(prev => ({...prev, current_value: e.target.value}))}
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="target-value" className="text-slate-300">Target Value</Label>
                        <Input
                          id="target-value"
                          type="number"
                          step="0.1"
                          value={goalForm.target_value}
                          onChange={(e) => setGoalForm(prev => ({...prev, target_value: e.target.value}))}
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="goal-unit" className="text-slate-300">Unit</Label>
                      <Select 
                        value={goalForm.unit} 
                        onValueChange={(value) => setGoalForm(prev => ({...prev, unit: value}))}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="lbs">lbs</SelectItem>
                          <SelectItem value="minutes">minutes</SelectItem>
                          <SelectItem value="km">km</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-slate-300">Target Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-slate-700 border-slate-600 text-white"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {goalForm.target_date ? format(goalForm.target_date, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-700 border-slate-600">
                          <Calendar
                            mode="single"
                            selected={goalForm.target_date}
                            onSelect={(date) => setGoalForm(prev => ({...prev, target_date: date}))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Create Goal
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Log Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitProgress} className="space-y-4">
                    <div>
                      <Label htmlFor="metric-type" className="text-slate-300">Metric Type</Label>
                      <Select 
                        value={progressForm.metric_type} 
                        onValueChange={(value) => setProgressForm(prev => ({...prev, metric_type: value}))}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="weight">Weight</SelectItem>
                          <SelectItem value="body_fat">Body Fat %</SelectItem>
                          <SelectItem value="muscle_mass">Muscle Mass</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="progress-value" className="text-slate-300">Value</Label>
                        <Input
                          id="progress-value"
                          type="number"
                          step="0.1"
                          value={progressForm.value}
                          onChange={(e) => setProgressForm(prev => ({...prev, value: e.target.value}))}
                          className="bg-slate-700 border-slate-600 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="progress-unit" className="text-slate-300">Unit</Label>
                        <Select 
                          value={progressForm.unit} 
                          onValueChange={(value) => setProgressForm(prev => ({...prev, unit: value}))}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lbs">lbs</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Log Progress
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">AI-Powered Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="insight-type" className="text-slate-300">What would you like insights about?</Label>
                  <Select 
                    value={insightType} 
                    onValueChange={setInsightType}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="workout_recommendation">Workout Recommendations</SelectItem>
                      <SelectItem value="nutrition_advice">Nutrition Advice</SelectItem>
                      <SelectItem value="progress_analysis">Progress Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={getAiInsights}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  {loading ? 'Generating Insights...' : 'Get AI Insights'}
                </Button>

                {aiInsights && (
                  <div className="mt-6 p-4 bg-slate-700 border border-slate-600 rounded-lg">
                    <h4 className="text-white font-semibold mb-3">AI Insights:</h4>
                    <p className="text-slate-200 whitespace-pre-line">{aiInsights}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default App;