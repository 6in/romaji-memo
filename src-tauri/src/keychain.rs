use keyring::Entry;
use std::sync::Mutex;

/// Retrieve an API key from OS Keychain.
/// Service name is always "romaji-memo", account is the provider_id.
pub fn get_api_key(
    keychain_lock: &Mutex<()>,
    provider_id: &str,
) -> Result<Option<String>, String> {
    let _guard = keychain_lock.lock().map_err(|e| format!("Lock error: {}", e))?;
    let entry = Entry::new("romaji-memo", provider_id)
        .map_err(|e| format!("Keychain entry error: {}", e))?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Keychain read error: {}", e)),
    }
}

/// Delete an API key from OS Keychain.
pub fn delete_api_key(
    keychain_lock: &Mutex<()>,
    provider_id: &str,
) -> Result<(), String> {
    let _guard = keychain_lock.lock().map_err(|e| format!("Lock error: {}", e))?;
    let entry = Entry::new("romaji-memo", provider_id)
        .map_err(|e| format!("Keychain entry error: {}", e))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // already gone
        Err(e) => Err(format!("Keychain delete error: {}", e)),
    }
}

/// Store an API key in OS Keychain (used by future settings UI).
pub fn set_api_key(
    keychain_lock: &Mutex<()>,
    provider_id: &str,
    api_key: &str,
) -> Result<(), String> {
    let _guard = keychain_lock.lock().map_err(|e| format!("Lock error: {}", e))?;
    let entry = Entry::new("romaji-memo", provider_id)
        .map_err(|e| format!("Keychain entry error: {}", e))?;
    entry
        .set_password(api_key)
        .map_err(|e| format!("Keychain write error: {}", e))
}
