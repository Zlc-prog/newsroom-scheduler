/// Show a native Save dialog and write binary data to the chosen path.
/// Returns `true` if saved, `false` if the user cancelled.
#[tauri::command]
async fn save_file(data: Vec<u8>, filename: String) -> Result<bool, String> {
  let filename_clone = filename.clone();
  let path = tauri::async_runtime::spawn_blocking(move || {
    rfd::FileDialog::new()
      .set_file_name(&filename_clone)
      .save_file()
  })
  .await
  .map_err(|e| e.to_string())?;

  match path {
    Some(p) => {
      std::fs::write(&p, &data).map_err(|e| e.to_string())?;
      Ok(true)
    }
    None => Ok(false),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![save_file])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
