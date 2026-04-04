use keyring::Entry;
use tokio::sync::Mutex;

/// Retrieve an API key from OS Keychain.
/// Service name is always "romaji-memo", account is the provider_id.
/// MUST be called from within spawn_blocking context.
pub fn get_api_key(
    keychain_lock: &Mutex<()>,
    provider_id: &str,
) -> Result<Option<String>, String> {
    let _guard = keychain_lock.blocking_lock();
    let entry = Entry::new("romaji-memo", provider_id)
        .map_err(|e| format!("Keychain entry error: {}", e))?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Keychain read error: {}", e)),
    }
}

/// Store an API key in OS Keychain (used by future settings UI).
pub fn set_api_key(
    keychain_lock: &Mutex<()>,
    provider_id: &str,
    api_key: &str,
) -> Result<(), String> {
    let _guard = keychain_lock.blocking_lock();
    let entry = Entry::new("romaji-memo", provider_id)
        .map_err(|e| format!("Keychain entry error: {}", e))?;
    entry
        .set_password(api_key)
        .map_err(|e| format!("Keychain write error: {}", e))
}
