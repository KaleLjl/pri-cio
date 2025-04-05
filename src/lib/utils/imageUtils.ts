/**
 * Finds the primary image URL from an array of images, or defaults to the first image.
 * @param images - Array of image objects, each with url and isPrimary properties.
 * @returns The URL of the primary image or the first image, or an empty string if no images exist.
 */
export const getPrimaryImage = (
  images:
    | {
        id: string;
        url: string;
        isPrimary: boolean;
      }[]
    | undefined
): string => {
  if (!images || images.length === 0) {
    return "";
  }
  const primaryImage = images.find((img) => img.isPrimary);
  return primaryImage?.url || images[0]?.url || "";
};
