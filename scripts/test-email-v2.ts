// Test script with improved content for better deliverability
import { sendOrderConfirmationEmail } from '../lib/email';

async function testEmail() {
  console.log('🧪 Testing email deliverability after spam training...\n');

  const testData = {
    orderNumber: 'TEST-002',
    orderId: 'test-order-id-v2',
    customerName: 'Mustaq Syed',
    customerEmail: 'syed.mustaq@gmail.com',
    items: [
      {
        productName: 'HP LaserJet Pro M404dn Printer',
        quantity: 1,
        price: 289.99,
        totalPrice: 289.99,
      },
    ],
    subtotal: 289.99,
    shippingAmount: 0,
    taxAmount: 0,
    totalAmount: 289.99,
    shippingAddress: {
      address1: '123 Test Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'GB',
    },
  };

  try {
    console.log('📧 Sending test email to syed.mustaq@gmail.com...');
    console.log('📝 This email should go to INBOX after spam training\n');
    const result = await sendOrderConfirmationEmail(testData);

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`Message ID: ${result.messageId}`);
      console.log('\n📬 Please check your Gmail INBOX (not spam) this time.');
      console.log('If it still goes to spam, mark as "Not spam" again to train Gmail.');
    } else {
      console.log('❌ Email failed to send:', result.error);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testEmail();