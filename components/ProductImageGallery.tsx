"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductImageGalleryProps {
  mainImage: string;
  additionalImages: string[];
  productName: string;
  discountPercentage?: number;
}

export function ProductImageGallery({
  mainImage,
  additionalImages,
  productName,
  discountPercentage,
}: ProductImageGalleryProps) {
  const allImages = [mainImage, ...additionalImages];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  return (
    <div>
      {/* Main Image */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
        {discountPercentage && discountPercentage > 0 && (
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-2 rounded-lg font-bold z-10">
            SAVE {discountPercentage}%
          </div>
        )}
        <Image
          src={allImages[selectedImageIndex]}
          alt={productName}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Thumbnail images */}
      {allImages.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImageIndex(idx)}
              className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition ${
                selectedImageIndex === idx
                  ? "border-primary-500"
                  : "border-transparent hover:border-primary-300"
              }`}
              aria-label={`View image ${idx + 1} of ${allImages.length}`}
            >
              <Image
                src={img}
                alt={`${productName} - Image ${idx + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

