// admin.ts
// PIN-based admin authentication.

// Valid admin PINs — in production these should come from env variables, not hardcoded
const ADMIN_PINS = ["123456", "admin2024", "secure123"];

// Checks the submitted PIN and returns a session token if it's valid
export const handleAdminLogin = async (req: any, res: any) => {
  const { adminPin } = req.body;

  try {
    if (ADMIN_PINS.includes(adminPin)) {
      res.status(200).json({ 
        success: true, 
        message: 'Authentication successful',
        sessionToken: generateSessionToken(adminPin)
      });
    } else {
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

// Creates a Base64 token from "pin:timestamp" — used to verify identity and session age
const generateSessionToken = (pin: string): string => {
  const timestamp = Date.now();
  return Buffer.from(`${pin}:${timestamp}`).toString('base64');
};

// Middleware that decodes the session token and checks if it's valid and not expired (24h)
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
    
    // Sessions expire after 24 hours
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