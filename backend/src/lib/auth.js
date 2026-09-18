import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { getJwtSecret } from '@/lib/authValidation';

export async function verifyAuth(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'No token provided, authorization denied' };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    
    return { user: decoded };
  } catch (error) {
    return { error: 'Token is not valid' };
  }
}
