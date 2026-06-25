// Test script to verify email configuration
import { sendOrderConfirmationEmail } from '../lib/email';

async function testEmail() {
  console.log('🧪 Testing email configuration...\n');

  const testData = {
    orderNumber: 'TEST-001',
    orderId: 'test-order-id',
    customerName: 'Test User',
    customerEmail: 'syed.mustaq@gmail.com',
    items: [
      {
        productName: 'Test Printer',
        quantity: 1,
        price: 299.99,
        totalPrice: 299.99,
      },
    ],
    subtotal: 299.99,
    shippingAmount: 0,
    taxAmount: 0,
    totalAmount: 299.99,
    shippingAddress: {
      address1: '123 Test Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'GB',
    },
  };

  try {
    console.log('📧 Sending test email to syed.mustaq@gmail.com...');
    const result = await sendOrderConfirmationEmail(testData);

    if (result.success) {
      console.log('\n✅ Email sent successfully!');
      console.log(`Message ID: ${result.messageId}`);
      if (result.previewUrl) {
        console.log(`Preview URL: ${result.previewUrl}`);
      }
      console.log('\n📬 Please check your Gmail inbox (and spam folder) for the test email.');
    } else {
      console.log('\n❌ Email failed to send:');
      console.log(`Error: ${result.error}`);
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testEmail();