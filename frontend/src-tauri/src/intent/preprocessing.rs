#[derive(Debug, Clone)]
pub struct PreprocessedQuery {
    pub raw: String,
    pub normalized: String,
    pub tokens: Vec<String>,
    pub has_negation: bool,
}

pub fn preprocess(input: &str) -> PreprocessedQuery {
    let lower = input.to_lowercase();
    let trimmed = lower.trim().to_string();
    let normalized = trimmed.replace('_', " ");

    let has_negation = lower.contains("do not")
        || lower.contains("don't")
        || lower.contains("dont")
        || lower.contains("never")
        || lower.contains("should not")
        || lower.contains("stop");

    let mut tokens = Vec::new();
    for part in lower.split(|c: char| !c.is_alphanumeric()) {
        let clean = part.trim();
        if !clean.is_empty() {
            tokens.push(clean.to_string());
        }
    }

    PreprocessedQuery {
        raw: input.to_string(),
        normalized,
        tokens,
        has_negation,
    }
}

pub fn is_conversational_or_noise(query: &PreprocessedQuery) -> bool {
    if query.tokens.is_empty() {
        return true;
    }

    let noise_words = [
        "hello",
        "hi",
        "hey",
        "good morning",
        "good afternoon",
        "greetings",
        "asdf",
        "test",
        "qwerty",
        "help",
        "thanks",
        "thank you",
        "bye",
    ];

    let full_text = query.normalized.as_str();
    for word in &noise_words {
        if full_text == *word {
            return true;
        }
    }

    if query.tokens.len() == 1 {
        let token = &query.tokens[0];
        if token == "hello" || token == "hi" || token == "hey" || token == "asdf" {
            return true;
        }
    }

    false
}
