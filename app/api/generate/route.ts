import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase-server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

console.log(
  "Supabase secret key loaded:",
  !!process.env.SUPABASE_SECRET_KEY,
  "prefix:",
  process.env.SUPABASE_SECRET_KEY?.slice(0, 10)
);

export async function POST(request: Request) {
  try {
        const supabaseServer = await createSupabaseServerClient();

const {
  data: { user },
} = await supabaseServer.auth.getUser();

const formData = await request.formData();

const data = {
  propertyType: formData.get("propertyType")?.toString() || "",
  listingType: formData.get("listingType")?.toString() || "",
  location: formData.get("location")?.toString() || "",
  language: formData.get("language")?.toString() || "",
  currency: formData.get("currency")?.toString() || "",
  price: formData.get("price")?.toString() || "",
  rentPeriod: formData.get("rentPeriod")?.toString() || "",
  propertySize: formData.get("propertySize")?.toString() || "",
  propertySizeUnit: formData.get("propertySizeUnit")?.toString() || "",
  bedrooms: formData.get("bedrooms")?.toString() || "",
  bathrooms: formData.get("bathrooms")?.toString() || "",
  features: formData.get("features")?.toString() || "",
};

const imageFiles = formData
  .getAll("images")
  .filter((item): item is File => item instanceof File);

if (imageFiles.length > 5) {
  return NextResponse.json(
    {
      success: false,
      message: "Please upload a maximum of 5 images.",
    },
    { status: 400 }
  );
}

for (const image of imageFiles) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
    return NextResponse.json(
      {
        success: false,
        message: "Only image files are allowed.",
      },
      { status: 400 }
    );
  }

  if (image.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      {
        success: false,
        message: "Each image must be 25 MB or smaller.",
      },
      { status: 400 }
    );
  }
}

  const imageParts = await Promise.all(
  imageFiles.map(async (file) => {
    const buffer = Buffer.from(await file.arrayBuffer());

    return {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: file.type,
      },
    };
  })
);

const imageInstruction =
  imageParts.length > 0
    ? `
IMAGE ANALYSIS:
- Carefully examine each uploaded property image.
- Use clearly visible information from the images to make the listing more useful and descriptive.
- Do not guess the identity, location, size, quality, condition, or purpose of something if it is unclear.
- Do not claim that something exists simply because it might normally be expected in that type of property.
- If an image does not provide useful additional information, rely on the user's written property details instead.
`
    : "";

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
    });

    const prompt = `
Create a professional real estate listing from the following property information.

Property Type: ${data.propertyType}
Listing Type: ${data.listingType}
Location: ${data.location}
Language: ${data.language}
Currency: ${data.currency}
Price: ${data.price}
Rental Period: ${data.listingType === "For Rent" ? data.rentPeriod : "Not applicable"}
Property Size: ${data.propertySize} ${data.propertySizeUnit}
Bedrooms: ${data.bedrooms}
Bathrooms: ${data.bathrooms}
Features: ${data.features}

Return ONLY valid JSON.

Use exactly this structure:

{
  "headline": "A catchy property headline",
  "description": "A professional full listing description",
  "shortDescription": "A short attractive description",
  "socialCaption": "A social media caption",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
}

Do not include markdown.
Do not include code fences.
Do not include any text before or after the JSON.

Make the writing professional, attractive, clear, and suitable for a real estate listing.

CONTENT LENGTH:
- Headline: 1 compelling sentence.
- Full listing description: approximately 150–200 words and clearly more detailed than the short description. Use 2–4 natural paragraphs.
- Short description: approximately 25–40 words and significantly shorter than the full listing description.
- Social media caption: approximately 40–70 words.
- Hashtags: 5–10 relevant hashtags.

CONTENT QUALITY:
- The full listing description should explain the property using the provided facts in a natural, engaging way.
- You may make the writing engaging and polished, but do not describe the property with unsupported factual or quality claims.
- Do not call the property luxury, premium, spacious, modern, beautiful, high-quality, convenient, comfortable, exceptional, or similar unless the user provided information supporting that description.
- Do not claim that the property provides a particular lifestyle, experience, view, atmosphere, privacy, or benefit unless supported by the user's input.
- Never invent or infer BHK, amenities, views, floor numbers, parking, gardens, pools, renovations, natural light, neighborhood characteristics, distances, or other property details unless explicitly provided.
- Never repeat the same sentence or idea simply to increase length.

IMPORTANT LANGUAGE RULE:
- Write the headline, full description, short description, social media caption, and hashtags in the selected language.
- Use the selected language naturally and professionally.
- Do not mix languages unless a proper name or necessary property term requires it.

IMPORTANT RULES:
- Use only information provided by the user or clearly visible in the uploaded property images.
- Do not invent, assume, or infer property facts that are not supported by the user's information or the images.
- You may describe features, rooms, furnishings, finishes, views, outdoor spaces, or other details only when they are clearly visible in the uploaded images.
- Use the exact currency provided by the user when a price is provided.
- If the user does not provide a price, do not mention a price anywhere in the generated listing.
- Never invent, estimate, calculate, or suggest a property price.
- If the listing type is "For Rent" and a rental period is provided, use the exact rental period provided by the user.
- Never assume that a rental price is per month.
- If the listing type is "For Sale", do not mention a rental period.
- You may make the writing engaging and professional, but all factual property information must come from the user's input.

${imageInstruction}

`;

    let result;

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    result = await model.generateContent([
  prompt,
  ...imageParts,
]);
    break;
  } catch (error: any) {
    console.log(`Gemini attempt ${attempt} failed:`, error);

    // Do not retry if the API quota has been exceeded
    if (error?.status === 429) {
      throw error;
    }

    if (attempt === 3) {
      throw error;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, attempt * 2000)
    );
  }
}

const response = result!.response;
const text = response.text();

    let listing;

    try {
      listing = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "The AI returned an unexpected response. Please try again.",
        },
        { status: 500 }
      );
    }

    console.log(
  "Admin client check:",
  process.env.SUPABASE_SECRET_KEY?.startsWith("sb_secret_")
);

    const { data: savedListing, error: saveError } = await supabaseAdmin
  .from("listings")
  .insert({
    user_id: user?.id || null,
    property_type: data.propertyType,
    listing_type: data.listingType,
    location: data.location,
    language: data.language,
    currency: data.currency,
    price: data.price,
    rent_period: data.rentPeriod,
    property_size: data.propertySize,
    property_size_unit: data.propertySizeUnit,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    features: data.features,
    headline: listing.headline,
    description: listing.description,
    short_description: listing.shortDescription,
    social_caption: listing.socialCaption,
    hashtags: listing.hashtags,
  })
  .select()
  .single();

if (saveError) {
  console.error("Supabase save error:", saveError);

  return NextResponse.json(
    {
      success: false,
      message: "The listing was generated but could not be saved.",
    },
    { status: 500 }
  );
}

    return NextResponse.json({
      success: true,
      result: listing,
    });
    } catch (error: any) {
    console.error("Gemini API error:", error);

    if (error?.status === 429) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Our AI service has reached its current usage limit. Please try again later.",
        },
        { status: 429 }
      );
    }

    if (error?.status === 503) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The AI service is temporarily busy. Please try again in a moment.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "The AI service is temporarily unavailable. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}