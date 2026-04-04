use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use rusqlite::Connection;
use crate::providers::ProviderAdapter;

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub providers: RwLock<HashMap<String, Arc<dyn ProviderAdapter + Send + Sync>>>,
    pub keychain_lock: Mutex<()>,
}
