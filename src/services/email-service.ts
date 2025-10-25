/**
 * Email Service for sending notifications
 * 
 * NOTE: This is a placeholder implementation. You need to integrate with an actual
 * email service provider like:
 * - SendGrid
 * - AWS SES
 * - Resend
 * - Nodemailer with SMTP
 * 
 * For production, create a backend API endpoint that handles email sending securely.
 */

export interface DeleteAccountEmailData {
  userEmail: string;
  userName: string;
  reason: string;
}

/**
 * Send account deletion notification email
 * 
 * To implement this properly:
 * 1. Create a backend API endpoint (e.g., /api/send-deletion-email)
 * 2. Use an email service provider SDK in your backend
 * 3. Call this endpoint from the frontend
 * 
 * Example backend implementation with SendGrid:
 * 
 * import sgMail from '@sendgrid/mail';
 * sgMail.setApiKey(process.env.SENDGRID_API_KEY);
 * 
 * const msg = {
 *   to: userEmail,
 *   from: 'noreply@yourdomain.com',
 *   subject: 'Account Deletion Notification',
 *   text: `Your account has been deleted. Reason: ${reason}`,
 *   html: `<strong>Your account has been deleted.</strong><p>Reason: ${reason}</p>`,
 * };
 * 
 * await sgMail.send(msg);
 */
export const sendAccountDeletionEmail = async (data: DeleteAccountEmailData): Promise<boolean> => {
  try {
    // Log email notification
    console.log('=== EMAIL NOTIFICATION ===');
    console.log('To:', data.userEmail);
    console.log('Subject: Account Deletion Notification');
    console.log('Content:');
    console.log(`Dear ${data.userName},`);
    console.log('');
    console.log('Your account on AI Mock Interview platform has been deleted by an administrator.');
    console.log('');
    console.log('Reason for deletion:');
    console.log(data.reason);
    console.log('');
    console.log('If you believe this was done in error, please contact support.');
    console.log('');
    console.log('Best regards,');
    console.log('AI Mock Interview Team');
    console.log('========================');
    
    // Using EmailJS for actual email sending (free service)
    // To enable: Sign up at https://www.emailjs.com/ and get your credentials
    // Then uncomment and configure below:
    
    try {
      // Check if EmailJS is configured
      const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      
      if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
              to_email: data.userEmail,
              to_name: data.userName,
              reason: data.reason,
              subject: 'Account Deletion Notification - AI Mock Interview',
            },
          }),
        });
        
        if (response.ok) {
          console.log('✅ Email sent successfully via EmailJS');
          return true;
        }
      }
    } catch (emailError) {
      console.warn('EmailJS not configured or failed, email logged to console only:', emailError);
    }
    
    // Return true even if email service fails (email is logged to console)
    return true;
  } catch (error) {
    console.error('Error sending deletion email:', error);
    return false;
  }
};

/**
 * Example backend API endpoint code (Node.js/Express):
 * 
 * // backend/routes/email.js
 * const express = require('express');
 * const router = express.Router();
 * const sgMail = require('@sendgrid/mail');
 * 
 * sgMail.setApiKey(process.env.SENDGRID_API_KEY);
 * 
 * router.post('/send-deletion-email', async (req, res) => {
 *   try {
 *     const { to, userName, reason } = req.body;
 *     
 *     const msg = {
 *       to,
 *       from: 'noreply@yourdomain.com',
 *       subject: 'Account Deletion Notification - AI Mock Interview',
 *       html: `
 *         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
 *           <h2 style="color: #e53e3e;">Account Deletion Notification</h2>
 *           <p>Dear ${userName},</p>
 *           <p>Your account on the AI Mock Interview platform has been deleted by an administrator.</p>
 *           <div style="background-color: #fee; padding: 15px; border-left: 4px solid #e53e3e; margin: 20px 0;">
 *             <strong>Reason for deletion:</strong>
 *             <p>${reason}</p>
 *           </div>
 *           <p>If you believe this was done in error, please contact our support team.</p>
 *           <p>Best regards,<br>AI Mock Interview Team</p>
 *         </div>
 *       `,
 *     };
 *     
 *     await sgMail.send(msg);
 *     res.json({ success: true });
 *   } catch (error) {
 *     console.error('Error sending email:', error);
 *     res.status(500).json({ success: false, error: error.message });
 *   }
 * });
 * 
 * module.exports = router;
 */
