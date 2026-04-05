use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;
use rusqlite::Connection;
use crate::providers::ProviderAdapter;

pub struct AppState {
    pub db: Arc<tokio::sync::Mutex<Connection>>,
    pub providers: RwLock<HashMap<String, Arc<dyn ProviderAdapter + Send + Sync>>>,
    pub keychain_lock: Mutex<()>,
}
