// Admin authentication using PIN-based system
// In production, store these securely in environment variables or a database
const ADMIN_PINS = ["123456", "admin2024", "secure123"];

export const handleAdminLogin = async (req: any, res: any) => {
  const { adminPin } = req.body;

  try {
    // Validate PIN
    if (ADMIN_PINS.includes(adminPin)) {
      // PIN is valid
      res.status(200).json({ 
        success: true, 
        message: 'Authentication successful',
        sessionToken: generateSessionToken(adminPin)
      });
    } else {
      // Invalid PIN
      res.status(401).json({ 
        success: false, 
        message: 'Invalid admin PIN' 
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred during authentication' 
    });
  }
};

// Helper function to generate a session token
const generateSessionToken = (pin: string): string => {
  const timestamp = Date.now();
  return Buffer.from(`${pin}:${timestamp}`).toString('base64');
};

// Middleware to verify admin session
export const verifyAdminSession = (req: any, res: any, next: any) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return res.status(401).json({ 
      success: false, 
      message: 'No session token provided' 
    });
  }

  try {
    const decoded = Buffer.from(sessionToken, 'base64').toString('utf-8');
    const [pin, timestamp] = decoded.split(':');
    
    // Check if PIN is valid and session hasn't expired (24 hours)
    const isExpired = Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000;
    
    if (ADMIN_PINS.includes(pin) && !isExpired) {
      next();
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired session' 
      });
    }
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid session token' 
    });
  }
};