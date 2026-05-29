//! Sleep prevention — keeps the system awake while Abu is running.
//!
//! Platform implementations:
//!   macOS   – spawns `caffeinate -s -i` as a child process.
//!              `-s` prevents system sleep (covers lid-close on AC power).
//!              `-i` prevents idle sleep (covers battery / display-sleep scenarios).
//!   Windows – calls `SetThreadExecutionState` with ES_CONTINUOUS |
//!              ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED.
//!   Other   – no-op.

// ─── macOS ────────────────────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
use std::{process::Child, sync::Mutex};

#[cfg(target_os = "macos")]
static CAFFEINATE_HANDLE: Mutex<Option<Child>> = Mutex::new(None);

#[cfg(target_os = "macos")]
fn enable_sleep_prevention() -> Result<(), String> {
    let mut guard = CAFFEINATE_HANDLE
        .lock()
        .map_err(|e| format!("lock poisoned: {e}"))?;
    if guard.is_some() {
        return Ok(()); // already active
    }
    let child = std::process::Command::new("caffeinate")
        .arg("-s") // -s: prevent system sleep (covers lid-close on AC power)
        .arg("-i") // -i: prevent idle sleep (covers no-AC / display-sleep scenarios)
        .spawn()
        .map_err(|e| format!("caffeinate spawn failed: {e}"))?;
    *guard = Some(child);
    Ok(())
}

#[cfg(target_os = "macos")]
fn disable_sleep_prevention() -> Result<(), String> {
    let mut guard = CAFFEINATE_HANDLE
        .lock()
        .map_err(|e| format!("lock poisoned: {e}"))?;
    if let Some(mut child) = guard.take() {
        child.kill().ok();
    }
    Ok(())
}

// ─── Windows ──────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
mod win {
    // Win32 execution state flags (winbase.h)
    const ES_CONTINUOUS: u32 = 0x8000_0000;
    const ES_SYSTEM_REQUIRED: u32 = 0x0000_0001;
    const ES_AWAYMODE_REQUIRED: u32 = 0x0000_0040;

    extern "system" {
        fn SetThreadExecutionState(es_flags: u32) -> u32;
    }

    /// Prevent idle sleep and away-mode (background work survives screen-off).
    pub fn enable() -> Result<(), String> {
        unsafe {
            SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED);
        }
        Ok(())
    }

    /// Restore default sleep behaviour.
    pub fn disable() -> Result<(), String> {
        unsafe {
            SetThreadExecutionState(ES_CONTINUOUS);
        }
        Ok(())
    }
}

#[cfg(target_os = "windows")]
fn enable_sleep_prevention() -> Result<(), String> {
    win::enable()
}

#[cfg(target_os = "windows")]
fn disable_sleep_prevention() -> Result<(), String> {
    win::disable()
}

// ─── Unsupported platforms ────────────────────────────────────────────────────

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn enable_sleep_prevention() -> Result<(), String> {
    Ok(())
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn disable_sleep_prevention() -> Result<(), String> {
    Ok(())
}

// ─── Tauri command ────────────────────────────────────────────────────────────

/// Toggle system sleep prevention.
///
/// `enabled = true`  → prevent system/idle sleep while Abu is running.
/// `enabled = false` → restore default sleep behaviour.
///
/// Called from the frontend on settings toggle and on app startup
/// (to restore the persisted preference).
#[tauri::command]
pub fn set_prevent_sleep(enabled: bool) -> Result<(), String> {
    if enabled {
        enable_sleep_prevention()
    } else {
        disable_sleep_prevention()
    }
}
