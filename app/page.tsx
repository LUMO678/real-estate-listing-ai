"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [propertyType, setPropertyType] = useState("House");
const [listingType, setListingType] = useState("For Sale");
const [location, setLocation] = useState("");
const [language, setLanguage] = useState("English");
const [currency, setCurrency] = useState("USD ($)");
const [price, setPrice] = useState("");
const [rentPeriod, setRentPeriod] = useState("Per Month");
const [propertySize, setPropertySize] = useState("");
const [propertySizeUnit, setPropertySizeUnit] = useState("sq ft");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [features, setFeatures] = useState("");
  const [images, setImages] = useState<File[]>([]);

  const [generatedListing, setGeneratedListing] = useState<{
  headline: string;
  description: string;
  shortDescription: string;
  socialCaption: string;
  hashtags: string[];
} | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
const [freeGenerations, setFreeGenerations] = useState(0);
const [limitReached, setLimitReached] = useState(false);
const [userEmail, setUserEmail] = useState("");

useEffect(() => {
  const savedCount = Number(
    localStorage.getItem("freeGenerations") || "0"
  );
  setFreeGenerations(savedCount);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      setUserEmail(user.email);
    } else {
      setUserEmail("");
    }
  };

  checkUser();
}, []);

  const optimizeImage = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const maxSize = 1600;
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Unable to process image."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);

          if (!blob) {
            reject(new Error("Unable to optimize image."));
            return;
          }

          resolve(
            new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"),
              {
                type: "image/jpeg",
              }
            )
          );
        },
        "image/jpeg",
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image."));
    };

    img.src = url;
  });

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && freeGenerations >= 3) {
  setLimitReached(true);
  setError("");
  return;
}

  setLoading(true);
setGeneratedListing(null);
setError("");
setLimitReached(false);

    try {
      const formData = new FormData();

formData.append("propertyType", propertyType);
formData.append("listingType", listingType);
formData.append("location", location);
formData.append("language", language);
formData.append("currency", currency);
formData.append("price", price);
formData.append("rentPeriod", rentPeriod);
formData.append("propertySize", propertySize);
formData.append("propertySizeUnit", propertySizeUnit);
formData.append("bedrooms", bedrooms);
formData.append("bathrooms", bathrooms);
formData.append("features", features);

const optimizedImages = await Promise.all(
  images.map((image) => optimizeImage(image))
);

optimizedImages.forEach((image) => {
  formData.append("images", image);
});

const response = await fetch("/api/generate", {
  method: "POST",
  body: formData,
});

      const data = await response.json();

      console.log(data);

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            "Something went wrong. Please try again in a moment."
        );
        return;
      }

      setGeneratedListing(data.result);
      if (!user) {
  const newCount = freeGenerations + 1;
  setFreeGenerations(newCount);
  localStorage.setItem("freeGenerations", String(newCount));

  if (newCount >= 3) {
    setLimitReached(true);
  }
}
    } catch (error) {
      console.error("Error connecting to API:", error);

      setError(
        "Unable to connect to the AI service. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
<div className="mb-10 text-center">
  <div className="mb-6 flex justify-end">
  {userEmail ? (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <span className="max-w-[220px] truncate text-sm font-medium text-gray-600">
        {userEmail}
      </span>

      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          setUserEmail("");
          setLimitReached(false);
          window.location.href = "/";
        }}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        Sign Out
      </button>
    </div>
  ) : (
    <a
      href="/login"
      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
    >
      Account / Sign In
    </a>
  )}
</div>

  <h1 className="text-4xl font-bold text-gray-900">
    AI Real Estate Listing Generator
  </h1>

  <p className="mt-3 text-lg text-gray-600">
    Create professional real estate listings in seconds with AI.
  </p>
</div>

        {!userEmail && freeGenerations < 3 && (
  <div className="mb-6 text-center">
    <p className="text-sm font-medium text-gray-600">
  {`${3 - freeGenerations} free ${
    3 - freeGenerations === 1 ? "generation" : "generations"
  } remaining`}
</p>
  </div>
)}

        {/* Form Card */}
        <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <h2 className="mb-6 text-2xl font-semibold text-gray-900">
            Property Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Property Type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Property Type
              </label>

              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option>House</option>
                <option>Apartment</option>
                <option>Villa</option>
                <option>Condo</option>
                <option>Townhouse</option>
                <option>Other</option>
              </select>
            </div>

            {/* Listing Type */}
<div>
  <label className="mb-2 block text-sm font-medium text-gray-700">
    Listing Type
  </label>

  <select
    value={listingType}
    onChange={(e) => setListingType(e.target.value)}
    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
  >
    <option>For Sale</option>
    <option>For Rent</option>
  </select>
</div>

            {/* Location */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Location
              </label>

              <input
                type="text"
                placeholder="e.g. New York, NY"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {/* Language */}
<div>
  <label className="mb-2 block text-sm font-medium text-gray-700">
    Listing Language
  </label>

  <select
    value={language}
    onChange={(e) => setLanguage(e.target.value)}
    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
  >
    <option>English</option>
    <option>Spanish</option>
    <option>French</option>
    <option>German</option>
    <option>Italian</option>
    <option>Portuguese</option>
    <option>Hindi</option>
    <option>Arabic</option>
    <option>Japanese</option>
    <option>Chinese</option>
  </select>
</div>

            {/* Price */}
<div>
  <label className="mb-2 block text-sm font-medium text-gray-700">
    Price
  </label>

  <div className="flex">
    {/* Currency */}
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className="rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 py-3 outline-none focus:border-blue-500"
    >
      <option>USD ($)</option>
      <option>EUR (€)</option>
      <option>GBP (£)</option>
      <option>INR (₹)</option>
      <option>AED (د.إ)</option>
      <option>CAD (C$)</option>
      <option>AUD (A$)</option>
      <option>SGD (S$)</option>
      <option>CHF (CHF)</option>
      <option>JPY (¥)</option>
      <option>CNY (¥)</option>
      <option>HKD (HK$)</option>
      <option>NZD (NZ$)</option>
      <option>KRW (₩)</option>
      <option>SAR (﷼)</option>
      <option>QAR (﷼)</option>
      <option>ZAR (R)</option>
      <option>BRL (R$)</option>
      <option>MXN (MX$)</option>
      <option>TRY (₺)</option>
    </select>

    {/* Price */}
    <input
      type="number"
      min="0"
      placeholder="e.g. 450000"
      value={price}
      onChange={(e) => setPrice(e.target.value)}
      className="w-full border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
    />

    {/* Rent Period */}
    {listingType === "For Rent" && (
      <select
        value={rentPeriod}
        onChange={(e) => setRentPeriod(e.target.value)}
        disabled={listingType !== "For Rent"}
        className="rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 py-3 outline-none focus:border-blue-500"
      >
        <option>Per Day</option>
        <option>Per Week</option>
        <option>Per Month</option>
        <option>Per Year</option>
      </select>
    )}
  </div>
</div>

            {/* Property Size */}
<div>
  <label className="mb-2 block text-sm font-medium text-gray-700">
    Property Size
  </label>

  <div className="flex">
    <input
      type="number"
      min="0"
      placeholder="e.g. 2500"
      value={propertySize}
      onChange={(e) => setPropertySize(e.target.value)}
      className="w-full rounded-l-lg border border-r-0 border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
    />

    <select
      value={propertySizeUnit}
      onChange={(e) => setPropertySizeUnit(e.target.value)}
      className="rounded-r-lg border border-gray-300 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500"
    >
      <option>sq ft</option>
      <option>sq m</option>
      <option>acres</option>
      <option>hectares</option>
    </select>
  </div>
</div>

            {/* Bedrooms & Bathrooms */}
<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
  {/* Bedrooms */}
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700">
      Bedrooms
    </label>

    <input
      type="number"
      min="0"
      placeholder="e.g. 3"
      value={bedrooms}
      onChange={(e) => setBedrooms(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
    />
  </div>

  {/* Bathrooms */}
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700">
      Bathrooms
    </label>

    <input
      type="number"
      min="0"
      placeholder="e.g. 2"
      value={bathrooms}
      onChange={(e) => setBathrooms(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
    />
  </div>
</div>

            {/* Features */}
<div>
  <label className="mb-2 block text-sm font-medium text-gray-700">
    Features
  </label>

  <textarea
    rows={5}
    placeholder="e.g. Modern kitchen, balcony, parking, garden, sea view, renovated bathroom, swimming pool..."
    value={features}
    onChange={(e) => setFeatures(e.target.value)}
    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
  />

  <p className="mt-2 text-sm text-gray-500">
    Add details such as kitchen features, living/dining areas, views,
    parking, outdoor spaces, amenities, renovations, nearby landmarks,
    building/floor information, accessibility, or other special features.
  </p>

  {/* Property Images */}
<div>
  <label className="mb-2 block text-sm font-medium text-gray-700">
    Property Images
  </label>

  <input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  multiple
  onChange={(e) => {
  const selectedImages = Array.from(e.target.files || []);

  if (selectedImages.length > 5) {
    setError("Please select a maximum of 5 images.");
    return;
  }

  if (selectedImages.some((image) => image.size > 25 * 1024 * 1024)) {
  setError("Each image must be 25 MB or smaller.");
  return;
}

  setError("");
  setImages(selectedImages);
}}
  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 outline-none focus:border-blue-500"
/>

  <p className="mt-2 text-sm text-gray-500">
  Upload up to 5 property images (JPG, PNG, or WebP). Each image can be up to 25 MB.
  Images will be optimized automatically before being analyzed by AI.
</p>
  {images.length > 0 && (
  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
    {images.map((image, index) => (
      <div
  key={`${image.name}-${index}`}
  className="relative overflow-hidden rounded-lg border border-gray-200"
>
  <img
    src={URL.createObjectURL(image)}
    alt={`Property image ${index + 1}`}
    className="h-32 w-full object-cover"
  />

  <button
    type="button"
    onClick={() => {
      setImages((currentImages) =>
        currentImages.filter((_, imageIndex) => imageIndex !== index)
      );
    }}
    className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white hover:bg-black"
  >
    Remove
  </button>
</div>
    ))}
  </div>
)}
</div>
</div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Generating..." : "Generate Listing"}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {limitReached ? (
  <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center shadow-sm">
    <h2 className="mb-2 text-xl font-semibold text-gray-900">
      You’ve used your 3 free generations
    </h2>

    <p className="mb-6 text-gray-600">
      Create a free account or sign in to continue generating professional
      property listings.
    </p>

    <a
      href="/login"
      className="inline-block rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
    >
      Create Free Account / Sign In
    </a>
  </div>
) : (
  error && (
    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-red-700">
        Unable to Generate Listing
      </h2>
      <p className="text-red-600">
        {error}
      </p>
    </div>
  )
)}

        {/* AI Generated Listing */}
{generatedListing && (
  <div className="mt-8 space-y-6">

    {/* Headline */}
    <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          ✨ Property Headline
        </h2>

        <button
          onClick={() =>
            navigator.clipboard.writeText(generatedListing.headline)
          }
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Copy
        </button>
      </div>

      <p className="text-lg font-medium leading-7 text-gray-800">
        {generatedListing.headline}
      </p>
    </div>

    {/* Full Description */}
    <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          🏠 Full Listing Description
        </h2>

        <button
          onClick={() =>
            navigator.clipboard.writeText(generatedListing.description)
          }
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Copy
        </button>
      </div>

      <p className="whitespace-pre-wrap leading-7 text-gray-700">
        {generatedListing.description}
      </p>
    </div>

    {/* Short Description */}
    <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          📝 Short Description
        </h2>

        <button
          onClick={() =>
            navigator.clipboard.writeText(
              generatedListing.shortDescription
            )
          }
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Copy
        </button>
      </div>

      <p className="leading-7 text-gray-700">
        {generatedListing.shortDescription}
      </p>
    </div>

    {/* Social Caption */}
    <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          📱 Social Media Caption
        </h2>

        <button
          onClick={() =>
            navigator.clipboard.writeText(
              generatedListing.socialCaption
            )
          }
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Copy
        </button>
      </div>

      <p className="whitespace-pre-wrap leading-7 text-gray-700">
        {generatedListing.socialCaption}
      </p>
    </div>

    {/* Hashtags */}
    <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          #️⃣ Hashtags
        </h2>

        <button
          onClick={() =>
            navigator.clipboard.writeText(
              generatedListing.hashtags.join(" ")
            )
          }
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Copy
        </button>
      </div>

      <p className="leading-7 text-gray-700">
        {generatedListing.hashtags.join(" ")}
      </p>
    </div>

  </div>
)}

      </div>
    </main>
  );
}