import { LanguageServiceClient } from "@google-cloud/language";

let languageClient;

function getClient() {
  if (!languageClient) {
    languageClient = new LanguageServiceClient();
  }
  return languageClient;
}

function inferUrgency(text) {
  const normalized = text.toLowerCase();
  if (/critical|urgent|immediate|life[- ]threat|severe/.test(normalized)) return "high";
  if (/soon|important|moderate|needed/.test(normalized)) return "medium";
  return "low";
}

export async function extractNeedInsightsFromText(text) {
  const client = getClient();

  const document = {
    content: text,
    type: "PLAIN_TEXT"
  };

  const [entitiesResponse] = await client.analyzeEntities({ document });
  const [sentimentResponse] = await client.analyzeSentiment({ document });

  const entities = entitiesResponse.entities || [];
  const keywords = entities
    .filter((entity) => entity.salience >= 0.02)
    .map((entity) => entity.name)
    .slice(0, 8);

  const locationEntity = entities.find((entity) =>
    (entity.type || "").toString().toLowerCase() === "location"
  );

  const urgency = inferUrgency(text);
  const sentimentScore = sentimentResponse.documentSentiment?.score || 0;

  return {
    keywords,
    locationHint: locationEntity?.name || null,
    urgencyHint: urgency,
    sentimentScore
  };
}
