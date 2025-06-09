use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone)]
struct PomodoroSession {
    completed_pomodoros: u32,
    total_focus_time: u32, // in seconds
    current_session: u32,
    date: String,
}

#[derive(Serialize, Deserialize)]
struct Task {
    id: u64,
    text: String,
    completed: bool,
    created_at: String,
    completed_at: Option<String>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn save_session_data(session: PomodoroSession, app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Create the directory if it doesn't exist
    fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    let file_path = app_data_dir.join("session.json");
    let json = serde_json::to_string_pretty(&session).map_err(|e| format!("Failed to serialize session: {}", e))?;
    
    fs::write(file_path, json).map_err(|e| format!("Failed to write session file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn load_session_data(app: tauri::AppHandle) -> Result<Option<PomodoroSession>, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let file_path = app_data_dir.join("session.json");
    
    if !file_path.exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(file_path).map_err(|e| format!("Failed to read session file: {}", e))?;
    let session: PomodoroSession = serde_json::from_str(&content).map_err(|e| format!("Failed to parse session: {}", e))?;
    
    Ok(Some(session))
}

#[tauri::command]
async fn save_tasks(tasks: Vec<Task>, app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Create the directory if it doesn't exist
    fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    let file_path = app_data_dir.join("tasks.json");
    let json = serde_json::to_string_pretty(&tasks).map_err(|e| format!("Failed to serialize tasks: {}", e))?;
    
    fs::write(file_path, json).map_err(|e| format!("Failed to write tasks file: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn load_tasks(app: tauri::AppHandle) -> Result<Vec<Task>, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let file_path = app_data_dir.join("tasks.json");
    
    if !file_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(file_path).map_err(|e| format!("Failed to read tasks file: {}", e))?;
    let tasks: Vec<Task> = serde_json::from_str(&content).map_err(|e| format!("Failed to parse tasks: {}", e))?;
    
    Ok(tasks)
}

#[tauri::command]
async fn get_stats_history(app: tauri::AppHandle) -> Result<Vec<PomodoroSession>, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let history_path = app_data_dir.join("history.json");
    
    if !history_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(history_path).map_err(|e| format!("Failed to read history file: {}", e))?;
    let history: Vec<PomodoroSession> = serde_json::from_str(&content).map_err(|e| format!("Failed to parse history: {}", e))?;
    
    Ok(history)
}

#[tauri::command]
async fn save_daily_stats(session: PomodoroSession, app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Create the directory if it doesn't exist
    fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    let history_path = app_data_dir.join("history.json");
    
    let mut history: Vec<PomodoroSession> = if history_path.exists() {
        let content = fs::read_to_string(&history_path).map_err(|e| format!("Failed to read history: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };
    
    // Remove existing entry for the same date and add the new one
    history.retain(|s| s.date != session.date);
    history.push(session);
    
    // Keep only last 30 days
    history.sort_by(|a, b| a.date.cmp(&b.date));
    if history.len() > 30 {
        let start_index = history.len() - 30;
        history.drain(0..start_index);
    }
    
    let json = serde_json::to_string_pretty(&history).map_err(|e| format!("Failed to serialize history: {}", e))?;
    fs::write(history_path, json).map_err(|e| format!("Failed to write history file: {}", e))?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_session_data,
            load_session_data,
            save_tasks,
            load_tasks,
            get_stats_history,
            save_daily_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
