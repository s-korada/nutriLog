const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking database tables...\n');

  // Check users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (usersError) {
    console.log('❌ Users table:', usersError.message);
    console.log('\n⚠️  Tables not found. Please run the SQL manually in Supabase dashboard.');
    console.log('\nGo to: https://supabase.com/dashboard → Your Project → SQL Editor');
    console.log('Then paste and run the SQL from the setup instructions.\n');
    return false;
  }

  console.log('✅ Users table exists');
  if (users.length > 0) {
    console.log(`   Default user: ${users[0].email}`);
  }

  // Check meals table
  const { error: mealsError } = await supabase
    .from('meals')
    .select('id')
    .limit(1);

  if (mealsError) {
    console.log('❌ Meals table:', mealsError.message);
    return false;
  }
  console.log('✅ Meals table exists');

  // Check conversations table
  const { error: convError } = await supabase
    .from('conversations')
    .select('id')
    .limit(1);

  if (convError) {
    console.log('❌ Conversations table:', convError.message);
    return false;
  }
  console.log('✅ Conversations table exists');

  // Check agent_logs table
  const { error: logsError } = await supabase
    .from('agent_logs')
    .select('id')
    .limit(1);

  if (logsError) {
    console.log('❌ Agent logs table:', logsError.message);
    return false;
  }
  console.log('✅ Agent logs table exists');

  console.log('\n✅ All tables are set up correctly!');
  console.log('\nYou can now use the app at http://localhost:3001');
  return true;
}

checkTables();
