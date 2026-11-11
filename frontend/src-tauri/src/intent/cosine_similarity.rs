pub fn cosine_similarity(vector_a: &[f32], vector_b: &[f32]) -> f64 {
    if vector_a.len() != vector_b.len() || vector_a.is_empty() {
        return 0.0;
    }

    let mut dot_product = 0.0f64;
    let mut norm_a = 0.0f64;
    let mut norm_b = 0.0f64;

    for i in 0..vector_a.len() {
        let val_a = vector_a[i] as f64;
        let val_b = vector_b[i] as f64;

        dot_product += val_a * val_b;
        norm_a += val_a * val_a;
        norm_b += val_b * val_b;
    }

    let magnitude_product = norm_a.sqrt() * norm_b.sqrt();
    if magnitude_product <= 1e-9 {
        return 0.0;
    }

    let score = dot_product / magnitude_product;
    score.clamp(0.0, 1.0)
}

pub fn l2_normalize(vector: &mut [f32]) {
    let mut sum_sq = 0.0f64;
    for val in vector.iter() {
        sum_sq += (*val as f64) * (*val as f64);
    }

    let norm = sum_sq.sqrt();
    if norm > 1e-9 {
        let inv_norm = (1.0 / norm) as f32;
        for val in vector.iter_mut() {
            *val *= inv_norm;
        }
    }
}
