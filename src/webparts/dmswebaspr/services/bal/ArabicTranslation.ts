import { spfi, SPFx } from "@pnp/sp/presets/all";

export const getArabicTranslation = async (
  sp: ReturnType<typeof spfi>,
  englishText: string
): Promise<string> => {
  if (!englishText?.trim()) return englishText;

  try {
    // 1️⃣ Check cache list first
    const existing = await sp.web.lists
      .getByTitle("TranslatedTextAr")
      .items.filter(`Title eq '${englishText.replace(/'/g, "''")}'`)
      .top(1)();

    if (existing.length > 0 && existing[0].ArabicText) {
      return existing[0].ArabicText;
    }

    // 2️⃣ Call translation API
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        englishText
      )}&langpair=en|ar`
    );

    const data = await response.json();
    const translatedText =
      data?.responseData?.translatedText || englishText;

    // 3️⃣ Save to SharePoint list
    await sp.web.lists.getByTitle("TranslatedTextAr").items.add({
      Title: englishText,
      ArabicText: translatedText,
      Language: "ar",
    });

    return translatedText;
  } catch (error) {
    console.error("Translation error:", error);
    return englishText; // fallback
  }
};
