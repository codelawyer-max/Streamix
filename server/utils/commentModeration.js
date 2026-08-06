const abusiveWords = [
  "idiot",
  "stupid",
  "dummy",
  "moron",
  "hate",
];

export const moderateComment = (comment) => {
  const text = (comment || "").trim();

  // Empty comment
  if (!text) {
    return {
      allowed: false,
      message: "Comment cannot be empty.",
    };
  }

  const lowerText = text.toLowerCase();


  // Abusive word detection
  const hasAbusiveWord = abusiveWords.some((word) =>
    lowerText.includes(word)
  );

  if (hasAbusiveWord) {
    return {
      allowed: false,
      message: "Comment contains inappropriate language.",
    };
  }


  // Excessive special characters
  const specialCharacters = text.replace(/[a-zA-Z0-9\s]/g, "");

  if (
    specialCharacters.length >= 8 &&
    specialCharacters.length > text.length * 0.5
  ) {
    return {
      allowed: false,
      message: "Comment contains excessive special characters.",
    };
  }


  // Same character repeated many times
  if (/(.)\1{7,}/.test(text)) {
    return {
      allowed: false,
      message: "Comment looks like spam.",
    };
  }


  // Repeated word detection
  const words = lowerText.split(/\s+/);

  const wordFrequency = {};

  words.forEach((word) => {
    if (word.length > 2) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });


  const hasRepeatedWord = Object.values(wordFrequency).some(
    (count) => count >= 4
  );


  if (hasRepeatedWord) {
    return {
      allowed: false,
      message: "Comment contains repeated spam text.",
    };
  }


  // Repeated full comment phrases
  const uniqueWords = new Set(words);

  if (
    words.length >= 6 &&
    uniqueWords.size <= words.length / 2
  ) {
    return {
      allowed: false,
      message: "Comment appears to be spam.",
    };
  }


  return {
    allowed: true,
  };
};