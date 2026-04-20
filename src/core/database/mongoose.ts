import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in .env.local')
}

declare global {
  var _mongoConn: typeof mongoose | null
  var _mongoPromise: Promise<typeof mongoose> | null
}

let cached = {
  conn: global._mongoConn ?? null,
  promise: global._mongoPromise ?? null,
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (error) {
    cached.promise = null
    throw error
  }

  global._mongoConn = cached.conn
  global._mongoPromise = cached.promise

  return cached.conn
}