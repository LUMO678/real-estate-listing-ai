import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function GET() {
  return Response.json({
    success: true,
    message: "Razorpay subscription API is ready!",
  });
}

export async function POST(request: Request) {
  try {
    const { planId } = await request.json();

    if (!planId) {
      return Response.json(
        {
          success: false,
          message: "Plan ID is required.",
        },
        { status: 400 }
      );
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      customer_notify: 1,
    });

    return Response.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error("Razorpay subscription error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to create subscription.",
      },
      { status: 500 }
    );
  }
}