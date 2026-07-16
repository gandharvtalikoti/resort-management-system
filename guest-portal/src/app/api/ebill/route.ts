import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room_id, email, bill } = body;

    if (!email || !bill) {
      return NextResponse.json({ error: 'Missing email or bill data' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json({ error: 'Email service misconfigured' }, { status: 500 });
    }

    // Filter out cancelled orders
    const validOrders = bill.orders.filter((o: any) => o.status !== 'cancelled');

    // Format bill as HTML
    const total = validOrders.reduce((sum: number, o: any) => sum + o.total, 0);
    
    let ordersHtml = '';
    if (validOrders.length > 0) {
      ordersHtml = validOrders.map((o: any) => {
        const itemsList = o.items.map((i: any) => `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${i.quantity}x ${i.name}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">₹${(i.price * i.quantity).toFixed(2)}</td>
          </tr>
        `).join('');
        return itemsList;
      }).join('');
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #DFA918;">Buddha Village Resort</h1>
        <h2>Digital Bill - Room ${room_id}</h2>
        <p>Thank you for staying with us. Here is the breakdown of your charges:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          ${ordersHtml || '<tr><td>No food & beverage charges.</td></tr>'}
        </table>
        
        <div style="font-size: 18px; font-weight: bold; border-top: 2px solid #DFA918; padding-top: 10px;">
          Total Amount: ₹${total.toFixed(2)}
        </div>
        
        <p style="color: #777; font-size: 12px; margin-top: 40px;">
          If you have any questions about this bill, please contact the front desk.
        </p>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Buddha Village Resort <onboarding@resend.dev>',
        to: email,
        subject: `Your Bill from Buddha Village Resort (Room ${room_id})`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API Error:', errorText);
      return NextResponse.json({ error: 'Failed to send email' }, { status: response.status });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('E-Bill error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
