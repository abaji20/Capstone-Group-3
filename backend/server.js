import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure your .env file is in the root directory
dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Health check to test DB connection
app.get('/api/test-db', async (req, res) => {
  const { count, error } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
  if (error) return res.status(500).json({ status: "Error", error: error.message });
  res.json({ status: "Success", message: "Database is connected!", count });
});

// Endpoint to create user and profile
app.post('/api/create-user', async (req, res) => {
  console.log('POST /api/create-user called with body:', req.body);

  const { email, fullName, role } = req.body;

  if (!email || !fullName || !role) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'Missing required fields: email, fullName, role' });
  }

  try {
    // 1. Create user in Auth
    console.log('Creating auth user for:', email);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'TemporaryPassword123!',
      user_metadata: { full_name: fullName, role },
      email_confirm: true
    });

    if (authError) {
      console.log('Auth error:', authError);
      return res.status(400).json({ error: 'Auth error: ' + authError.message });
    }

    console.log('Auth user created, ID:', authData.user.id);

    // 2. Insert profile safely
    console.log('Inserting profile for user:', authData.user.id);
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
      id: authData.user.id,
      email: email,
      full_name: fullName,
      role: role
    }]);

    if (profileError) {
      console.log('Profile insert error:', profileError);
      // Clean up the created auth user if profile insertion fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Database error saving new user profile: ' + profileError.message });
    }

    console.log('Profile created successfully');
    res.json({ success: true, user: authData.user });
  } catch (err) {
    console.log('Unexpected error:', err);
    res.status(500).json({ error: 'Unexpected server error: ' + err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});