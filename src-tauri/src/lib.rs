// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// This function can be called from JavaScript using window.__TAURI__.invoke('greet', { name: 'World' })
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Main entry point for the Tauri app
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init()) // Allows opening URLs in browser
        .invoke_handler(tauri::generate_handler![greet]) // Register our greet function
        .run(tauri::generate_context!()) // Start the app
        .expect("error while running tauri application");
}
