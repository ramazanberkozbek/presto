// Wait for Supabase to be available
function waitForSupabase() {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (window.supabase && window.supabase.createClient) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
    setTimeout(() => reject(new Error('Supabase timeout')), 5000);
  });
}

// Initialize Supabase client
let supabase = null;
let authHelpers = null;

async function initSupabase() {
  await waitForSupabase();
  
  const { createClient } = window.supabase;
  const { invoke } = window.__TAURI__.core;
  
  // Get environment variables from Tauri backend
  let supabaseUrl, supabaseAnonKey;
  
  try {
    supabaseUrl = await invoke('get_env_var', { key: 'SUPABASE_URL' });
    supabaseAnonKey = await invoke('get_env_var', { key: 'SUPABASE_ANON_KEY' });
  } catch (error) {
    console.error('Failed to load environment variables:', error);
    throw new Error('Failed to load Supabase configuration from environment');
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Create Supabase client
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Configure redirect URLs for OAuth
      redirectTo: window.location.origin,
      // Enable deep links for OAuth in Tauri
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    }
  });

  // Auth helper functions
  authHelpers = {
  // Sign in with email/password
  async signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign up with email/password
  async signUpWithEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    return { data, error }
  },

  // Sign in with OAuth providers
  async signInWithProvider(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Deep link redirect for Tauri app
        redirectTo: 'com.presto.app://auth'
      }
    })
    return { data, error }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  getCurrentUser() {
    return supabase.auth.getUser()
  },

  // Get current session
  getSession() {
    return supabase.auth.getSession()
  },

    // Listen for auth state changes
    onAuthStateChange(callback) {
      return supabase.auth.onAuthStateChange(callback)
    }
  };
}

// Export functions to get initialized instances
export function getSupabase() {
  return supabase;
}

export function getAuthHelpers() {
  return authHelpers;
}

// Initialize and export
export { initSupabase };