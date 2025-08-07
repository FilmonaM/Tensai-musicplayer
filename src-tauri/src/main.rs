// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Entry point - calls the main app logic from lib.rs
fn main() {
    tensai_musicplayer_lib::run()
}
