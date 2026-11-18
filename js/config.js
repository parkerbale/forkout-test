// Forkout app settings. These two values are safe to ship in the app (they are public by design);
// the secret Anthropic key lives only on the server. Leave them empty to run the screens in demo mode.
window.FK_CONFIG = {
  supabaseUrl: 'https://xvvcqgpvscexdvpfpbvu.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dmNxZ3B2c2NleGR2cGZwYnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3NjQ3MzAsImV4cCI6MjEwOTM0MDczMH0.F3y-R3wvFqeq6PkbMAgWTgBpkk9vvF9P6ChlgJVcsLQ'   // the public "anon" key only. public key only; never a secret key
};
