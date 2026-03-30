import vision from "@google-cloud/vision";

let imageAnnotatorClient;

function getClient() {
  if (!imageAnnotatorClient) {
    imageAnnotatorClient = new vision.ImageAnnotatorClient();
  }
  return imageAnnotatorClient;
}

export async function extractTextFromImage(imageBase64) {
  const client = getClient();

  const [result] = await client.textDetection({
    image: { content: imageBase64 }
  });

  return result.fullTextAnnotation?.text || "";
}
