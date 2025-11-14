// Test setup file - runs before all tests
// Set environment variables needed for tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-long!!';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.NODE_ENV = 'test';
process.env.TWILIO_ACCOUNT_SID = 'AC123456';
process.env.TWILIO_AUTH_TOKEN = 'test-token';
process.env.TWILIO_PHONE_NUMBER = '+15555551234';
