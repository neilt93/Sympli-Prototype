import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting account for user:', email);

    try {
      // First, find the user in auth.users
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ Error listing auth users:', listError);
        return NextResponse.json(
          { error: 'Failed to find user' },
          { status: 500 }
        );
      }

      const authUser = authUsers.users.find((user: any) => user.email === email);
      
      if (!authUser) {
        console.error('❌ User not found in auth.users:', email);
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Delete from auth.users using admin API
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUser.id);
      
      if (deleteAuthError) {
        console.error('❌ Error deleting from auth.users:', deleteAuthError);
        return NextResponse.json(
          { error: 'Failed to delete user account' },
          { status: 500 }
        );
      }

      console.log('✅ Deleted from auth.users:', authUser.id);

      // Delete from public.users (this should happen automatically via trigger, but let's be explicit)
      const { error: deletePublicError } = await supabase
        .from('users')
        .delete()
        .eq('id', authUser.id);

      if (deletePublicError) {
        console.error('⚠️ Error deleting from public.users:', deletePublicError);
        // Continue anyway - the trigger should handle this
      } else {
        console.log('✅ Deleted from public.users');
      }

      // Delete related data
      const { error: deleteSymptomsError } = await supabase
        .from('symptom_logs')
        .delete()
        .eq('user_id', authUser.id);

      if (deleteSymptomsError) {
        console.error('⚠️ Error deleting symptom logs:', deleteSymptomsError);
      } else {
        console.log('✅ Deleted symptom logs');
      }

      const { error: deleteOnboardingError } = await supabase
        .from('onboarding_data')
        .delete()
        .eq('user_id', authUser.id);

      if (deleteOnboardingError) {
        console.error('⚠️ Error deleting onboarding data:', deleteOnboardingError);
      } else {
        console.log('✅ Deleted onboarding data');
      }

      console.log('🎉 Account deleted successfully for user:', email);

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Account deleted successfully',
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Account deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
