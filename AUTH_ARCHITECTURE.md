# Supabase Auth Architecture: Dual Table System

## Overview

This project uses a **dual-table architecture** with Supabase Auth, consisting of:

1. **`auth.users`** - Supabase's built-in authentication table
2. **`public.users`** - Your custom application profile table (MAIN TABLE)

## Why Both Tables Are Needed

### `auth.users` (Supabase Built-in)
- **Purpose**: Handles authentication, sessions, and security
- **Managed by**: Supabase Auth service
- **Contains**:
  - User ID (UUID)
  - Email address
  - Encrypted password
  - Email verification status
  - Session tokens
  - Account status (active/inactive)
  - Timestamps (created_at, updated_at, last_sign_in_at)

### `public.users` (Your Custom Table - MAIN TABLE)
- **Purpose**: Stores application-specific user data
- **Managed by**: Your application
- **Contains**:
  - Profile information (full_name, preferences)
  - Medical data (blood_type, allergies, medications)
  - GDPR compliance data (consent records, data retention)
  - Onboarding status
  - Application-specific flags and settings

## Benefits of This Architecture

### 1. **Separation of Concerns**
- Authentication logic is handled by Supabase
- Application data is handled by your code
- Clear boundaries between security and business logic

### 2. **Security**
- Supabase handles password hashing, session management, and security best practices
- Your application data is protected by Row Level Security (RLS)
- No sensitive auth data in your application tables

### 3. **Flexibility**
- You can add any fields to `public.users` without affecting auth
- Easy to extend user profiles with new features
- Can implement complex GDPR compliance features

### 4. **Compliance**
- GDPR consent tracking
- Data retention policies
- Data subject rights (access, deletion, portability)
- Audit logging

## How It Works

### User Registration Flow (Updated)
1. **Check if user exists in `public.users`** (main table first)
2. **Check if user exists in `auth.users`**
3. **Handle different scenarios**:
   - **Both exist**: Return "already registered" error
   - **Public exists, Auth doesn't**: Create auth user and link to existing profile
   - **Auth exists, Public doesn't**: Create profile for existing auth user
   - **Neither exists**: Create in both tables
4. **Return combined user data to frontend**

### User Login Flow
1. User submits login credentials
2. Authenticate against `auth.users` via Supabase Auth
3. Fetch profile data from `public.users`
4. Return combined auth + profile data

### Data Synchronization
- **Automatic**: Database triggers sync changes between tables
- **Manual**: Use `sync_existing_users()` function for existing data
- **Robust**: Handles edge cases and orphaned records

## Database Triggers

The system includes automatic triggers to keep tables in sync:

```sql
-- When user is created in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When user is updated in auth.users  
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_update();

-- When user is deleted in auth.users
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.handle_user_deletion();
```

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure users can only access their own data:

```sql
-- Users can only access their own profile
create policy "users_select_own" on public.users
  for select using (id = auth.uid());

-- Users can only update their own profile
create policy "users_update_own" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());
```

## Best Practices

### 1. **Always Use Supabase Auth for Authentication**
```typescript
// ✅ Correct - Use Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
});

// ❌ Wrong - Don't implement your own auth
const user = await customAuthService.authenticate(email, password);
```

### 2. **Access Profile Data via public.users**
```typescript
// ✅ Correct - Get profile from public.users
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single();

// ❌ Wrong - Don't store profile data in auth.users metadata
const profile = user.user_metadata;
```

### 3. **Use Service Role for Admin Operations**
```typescript
// ✅ Correct - Use service role for admin operations
const supabaseAdmin = createClient(url, serviceRoleKey);
const { data } = await supabaseAdmin.auth.admin.createUser({...});

// ❌ Wrong - Don't use anon key for admin operations
const { data } = await supabase.auth.createUser({...});
```

### 4. **Handle Missing Profiles Gracefully**
```typescript
// ✅ Correct - Handle cases where profile doesn't exist
const { data: profile, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single();

if (error) {
  // User exists in auth but not in profile table
  // This can happen during registration or if triggers fail
  console.log('Profile not found, user may need onboarding');
}
```

### 5. **Check Both Tables During Registration**
```typescript
// ✅ Correct - Check public.users first (main table)
const { data: existingPublicUser } = await supabase
  .from('users')
  .select('id, email, is_active')
  .eq('email', email)
  .single();

// Then check auth.users
const { data: authUsers } = await supabase.auth.admin.listUsers();
const existingAuthUser = authUsers.users.find(u => u.email === email);

// Handle different scenarios appropriately
```

## Troubleshooting

### Common Issues

#### 1. "Invalid login credentials" Error
**Cause**: User exists in `public.users` but not in `auth.users`
**Solution**: 
- Run the sync script: `node sync_users.js`
- Or manually create user in `auth.users` via Supabase dashboard

#### 2. Profile Data Missing
**Cause**: User exists in `auth.users` but not in `public.users`
**Solution**:
- Check if database triggers are working
- Run sync function: `SELECT public.sync_existing_users();`
- Manually create profile record

#### 3. RLS Policy Errors
**Cause**: User ID mismatch between tables
**Solution**:
- Ensure `public.users.id` references `auth.users.id`
- Check that user is properly authenticated
- Verify RLS policies are correctly configured

### Debugging Commands

```sql
-- Check user counts
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users,
  (SELECT COUNT(*) FROM public.users) as public_users;

-- Find users missing from public.users
SELECT id, email FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.users);

-- Find orphaned public.users records
SELECT id, email FROM public.users 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Check trigger status
SELECT * FROM information_schema.triggers 
WHERE trigger_name LIKE '%auth_user%';

-- Check sync status using utility function
SELECT * FROM public.check_user_sync_status();
```

### Utility Scripts

```bash
# Check synchronization status
node check_sync.js

# Sync existing users
node sync_users.js
```

## Migration Guide

If you're migrating from a single-table system:

1. **Backup existing data**
2. **Run the setup script** to create the dual-table structure
3. **Migrate existing users** using the sync function
4. **Update your application code** to use the new architecture
5. **Test thoroughly** before deploying

## Security Considerations

- **Never store sensitive auth data** in `public.users`
- **Use RLS policies** to protect all data
- **Validate user permissions** before any operation
- **Log all sensitive operations** for audit purposes
- **Implement proper GDPR compliance** features

## Performance Notes

- **Indexes**: Ensure proper indexes on frequently queried fields
- **Joins**: Avoid joining `auth.users` and `public.users` in queries
- **Caching**: Consider caching profile data for frequently accessed information
- **Pagination**: Use proper pagination for large datasets
