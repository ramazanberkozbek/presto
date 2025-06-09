use serde::{Deserialize, Serialize};
use std::fs;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

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

#[derive(Serialize, Deserialize, Clone)]
struct AppSettings {
    shortcuts: ShortcutSettings,
    timer: TimerSettings,
    notifications: NotificationSettings,
}

#[derive(Serialize, Deserialize, Clone)]
struct ShortcutSettings {
    start_stop: Option<String>,
    reset: Option<String>,
    skip: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
struct TimerSettings {
    focus_duration: u32,
    break_duration: u32,
    long_break_duration: u32,
    total_sessions: u32,
}

#[derive(Serialize, Deserialize, Clone)]
struct NotificationSettings {
    desktop_notifications: bool,
    sound_notifications: bool,
    auto_start_breaks: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            shortcuts: ShortcutSettings {
                start_stop: Some("CommandOrControl+Alt+Space".to_string()),
                reset: Some("CommandOrControl+Alt+R".to_string()),
                skip: Some("CommandOrControl+Alt+S".to_string()),
            },
            timer: TimerSettings {
                focus_duration: 25,
                break_duration: 5,
                long_break_duration: 20,
                total_sessions: 10,
            },
            notifications: NotificationSettings {
                desktop_notifications: true,
                sound_notifications: true,
                auto_start_breaks: true,
            },
        }
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn save_session_data(session: PomodoroSession, app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create the directory if it doesn't exist
    fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let file_path = app_data_dir.join("session.json");
    let json = serde_json::to_string_pretty(&session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;

    fs::write(file_path, json).map_err(|e| format!("Failed to write session file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_session_data(app: tauri::AppHandle) -> Result<Option<PomodoroSession>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let file_path = app_data_dir.join("session.json");

    if !file_path.exists() {
        return Ok(None);
    }

    let content =
        fs::read_to_string(file_path).map_err(|e| format!("Failed to read session file: {}", e))?;
    let session: PomodoroSession =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse session: {}", e))?;

    Ok(Some(session))
}

#[tauri::command]
async fn save_tasks(tasks: Vec<Task>, app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create the directory if it doesn't exist
    fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let file_path = app_data_dir.join("tasks.json");
    let json = serde_json::to_string_pretty(&tasks)
        .map_err(|e| format!("Failed to serialize tasks: {}", e))?;

    fs::write(file_path, json).map_err(|e| format!("Failed to write tasks file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_tasks(app: tauri::AppHandle) -> Result<Vec<Task>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let file_path = app_data_dir.join("tasks.json");

    if !file_path.exists() {
        return Ok(Vec::new());
    }

    let content =
        fs::read_to_string(file_path).map_err(|e| format!("Failed to read tasks file: {}", e))?;
    let tasks: Vec<Task> =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse tasks: {}", e))?;

    Ok(tasks)
}

#[tauri::command]
async fn get_stats_history(app: tauri::AppHandle) -> Result<Vec<PomodoroSession>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let history_path = app_data_dir.join("history.json");

    if !history_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(history_path)
        .map_err(|e| format!("Failed to read history file: {}", e))?;
    let history: Vec<PomodoroSession> =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse history: {}", e))?;

    Ok(history)
}

#[tauri::command]
async fn save_daily_stats(session: PomodoroSession, app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create the directory if it doesn't exist
    fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let history_path = app_data_dir.join("history.json");

    let mut history: Vec<PomodoroSession> = if history_path.exists() {
        let content = fs::read_to_string(&history_path)
            .map_err(|e| format!("Failed to read history: {}", e))?;
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

    let json = serde_json::to_string_pretty(&history)
        .map_err(|e| format!("Failed to serialize history: {}", e))?;
    fs::write(history_path, json).map_err(|e| format!("Failed to write history file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn update_tray_icon(
    app: tauri::AppHandle,
    timer_text: String,
    is_running: bool,
    session_mode: String,
    current_session: u32,
    total_sessions: u32,
) -> Result<(), String> {
    // Aggiorna il titolo dell'icona della tray con il timer
    if let Some(tray) = app.tray_by_id("main") {
        let mode_icon = match session_mode.as_str() {
            "focus" => "🍅",
            "break" => "😌",
            "longBreak" => "🎉",
            _ => "⏱️",
        };

        let status = if is_running { "Running" } else { "Paused" };

        // Su macOS, mostra il timer nel titolo dell'icona della menu bar
        let title = format!("{} {}", mode_icon, timer_text);
        tray.set_title(Some(title))
            .map_err(|e| format!("Failed to set title: {}", e))?;

        // Tooltip con informazioni dettagliate
        let tooltip = if session_mode == "focus" {
            format!(
                "Tempo - Session {}/{} ({})",
                current_session, total_sessions, status
            )
        } else {
            format!(
                "Tempo - {} ({})",
                if session_mode == "longBreak" {
                    "Long Break"
                } else {
                    "Short Break"
                },
                status
            )
        };

        tray.set_tooltip(Some(tooltip))
            .map_err(|e| format!("Failed to set tooltip: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn show_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .show()
            .map_err(|e| format!("Failed to show window: {}", e))?;
        window
            .set_focus()
            .map_err(|e| format!("Failed to focus window: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn save_settings(settings: AppSettings, app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    fs::create_dir_all(&app_data_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let file_path = app_data_dir.join("settings.json");
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(file_path, json).map_err(|e| format!("Failed to write settings file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let file_path = app_data_dir.join("settings.json");

    if !file_path.exists() {
        return Ok(AppSettings::default());
    }

    let contents = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;
    let settings: AppSettings =
        serde_json::from_str(&contents).map_err(|e| format!("Failed to parse settings: {}", e))?;

    Ok(settings)
}

#[tauri::command]
async fn register_global_shortcuts(
    app: tauri::AppHandle,
    shortcuts: ShortcutSettings,
) -> Result<(), String> {
    // Note: For now, we'll store the shortcuts but not actually register them
    // as global shortcuts in Tauri 2 require a different approach
    // The shortcuts will work as local shortcuts when the app has focus

    // Emit an event to the frontend to update local shortcuts
    app.emit("shortcuts-updated", &shortcuts)
        .map_err(|e| format!("Failed to emit shortcuts update: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn reset_all_data(app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Lista di tutti i file da eliminare
    let files_to_delete = vec![
        "session.json",
        "tasks.json",
        "history.json",
        "settings.json",
    ];

    // Elimina tutti i file di dati
    for file_name in files_to_delete {
        let file_path = app_data_dir.join(file_name);
        if file_path.exists() {
            fs::remove_file(file_path)
                .map_err(|e| format!("Failed to delete {}: {}", file_name, e))?;
        }
    }

    // Opzionalmente, elimina l'intera directory se è vuota
    // (lasciamo questa parte commentata per sicurezza)
    /*
    if app_data_dir.exists() {
        let _ = fs::remove_dir(&app_data_dir);
    }
    */

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
            save_daily_stats,
            update_tray_icon,
            show_window,
            save_settings,
            load_settings,
            register_global_shortcuts,
            reset_all_data
        ])
        .setup(|app| {
            // Crea il menu della tray
            let show_item = MenuItem::with_id(app, "show", "Mostra Tempo", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Esci", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            // Crea l'icona della tray
            let app_handle = app.handle().clone();
            let app_handle_for_click = app_handle.clone();

            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |_tray, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app_handle.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(move |_tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(window) = app_handle_for_click.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Gestisci il close event per nascondere invece di chiudere
            if let Some(window) = app.get_webview_window("main") {
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Nascondi la finestra invece di chiuderla
                        api.prevent_close();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
