import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { getJwtSecret } from '@/lib/authValidation';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function verifyAuth(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided, authorization denied' };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    
    // Add DB check to ensure user hasn't been suspended or deleted
    await connectDB();
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return { error: 'User no longer exists', status: 401 };
    }

    if (user.is_suspended) {
      return { error: 'Your account has been suspended by the administrator.', status: 403, isSuspended: true };
    }
    
    return { user: { ...decoded, is_suspended: user.is_suspended, role: user.role } };
  } catch (error) {
    return { error: 'Token is not valid' };
  }
}

// Admin-specific authorization check
export async function verifyAdminAuth(request) {
  const authResult = await verifyAuth(request);
  if (authResult.error) {
    return authResult; // Contains { error: ... }
  }

  // We don't need to fetch the DB user again unless we want the full db object, 
  // because verifyAuth already fetched it! Let's fetch it anyway for the dbUser property, 
  // or just use authResult.user.role which is populated from DB.
  
  if (authResult.user.role !== 'admin') {
    return { error: 'Forbidden: Admin access required', status: 403 };
  }

  // We'll refetch just to preserve the exact API contract we established earlier
  const dbUser = await User.findById(authResult.user.id);

  return { user: authResult.user, dbUser };
}