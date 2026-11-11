use crate::config::{EMBEDDING_DIM, MODEL_DIR, MODEL_FILE_NAME, TOKENIZER_FILE_NAME};
use crate::error::AppError;
use crate::intent::cosine_similarity::l2_normalize;
use ort::session::Session;
use ort::session::builder::GraphOptimizationLevel;
use ort::value::Tensor;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tokenizers::Tokenizer;

pub struct SemanticEngine {
    session: Mutex<Session>,
    tokenizer: Tokenizer,
}

impl SemanticEngine {
    pub fn load_from_dir<P: AsRef<Path>>(base_dir: P) -> Result<Self, AppError> {
        let dir = base_dir.as_ref();
        let model_path = dir.join(MODEL_FILE_NAME);
        let tokenizer_path = dir.join(TOKENIZER_FILE_NAME);

        if !model_path.exists() {
            return Err(AppError::ModelError(format!(
                "ONNX model file not found at: {}",
                model_path.display()
            )));
        }

        if !tokenizer_path.exists() {
            return Err(AppError::ModelError(format!(
                "Tokenizer configuration not found at: {}",
                tokenizer_path.display()
            )));
        }

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| AppError::ModelError(format!("Failed to load tokenizer: {e}")))?;

        let env = ort::init()
            .with_name("spil-mini-erp")
            .build()
            .map_err(|e| AppError::ModelError(format!("Failed to create ONNX environment: {e}")))?;

        let session = Session::builder(&env)
            .map_err(|e| {
                AppError::ModelError(format!("Failed to create ONNX session builder: {e}"))
            })?
            .with_optimization_level(GraphOptimizationLevel::Level3)
            .map_err(|e| AppError::ModelError(format!("Failed to set optimization level: {e}")))?
            .with_intra_threads(1)
            .map_err(|e| AppError::ModelError(format!("Failed to set thread count: {e}")))?
            .commit_from_file(&model_path)
            .map_err(|e| AppError::ModelError(format!("Failed to load ONNX model: {e}")))?;

        Ok(Self {
            session: Mutex::new(session),
            tokenizer,
        })
    }

    pub fn find_and_load() -> Result<Self, AppError> {
        let candidates = [
            PathBuf::from(MODEL_DIR),
            PathBuf::from("frontend/src-tauri").join(MODEL_DIR),
            PathBuf::from("src-tauri").join(MODEL_DIR),
            PathBuf::from(r"E:\spil\spil-mini-erp\frontend\src-tauri").join(MODEL_DIR),
        ];

        for candidate in &candidates {
            if candidate.join(MODEL_FILE_NAME).exists() {
                return Self::load_from_dir(candidate);
            }
        }

        Err(AppError::ModelError(format!(
            "Could not locate all-MiniLM-L6-v2 model in candidate locations: {candidates:?}"
        )))
    }

    pub fn encode(&self, text: &str) -> Result<Vec<f32>, AppError> {
        let encoding = self
            .tokenizer
            .encode(text, true)
            .map_err(|e| AppError::ModelError(format!("Tokenization error: {e}")))?;

        let ids: Vec<i64> = encoding.get_ids().iter().map(|&x| x as i64).collect();
        let mask: Vec<i64> = encoding
            .get_attention_mask()
            .iter()
            .map(|&x| x as i64)
            .collect();
        let type_ids: Vec<i64> = encoding.get_type_ids().iter().map(|&x| x as i64).collect();

        let seq_len = ids.len();
        if seq_len == 0 {
            return Ok(vec![0.0; EMBEDDING_DIM]);
        }

        let shape = [1, seq_len];

        let ids_tensor = Tensor::from_array((shape, ids.into_boxed_slice()))
            .map_err(|e| AppError::ModelError(format!("Failed to create ids tensor: {e}")))?;
        let mask_tensor = Tensor::from_array((shape, mask.clone().into_boxed_slice()))
            .map_err(|e| AppError::ModelError(format!("Failed to create mask tensor: {e}")))?;
        let type_ids_tensor = Tensor::from_array((shape, type_ids.into_boxed_slice()))
            .map_err(|e| AppError::ModelError(format!("Failed to create type_ids tensor: {e}")))?;

        let mut session = self
            .session
            .lock()
            .map_err(|e| AppError::ModelError(e.to_string()))?;

        let outputs = session
            .run(ort::inputs![
                "input_ids" => ids_tensor,
                "attention_mask" => mask_tensor,
                "token_type_ids" => type_ids_tensor,
            ])
            .map_err(|e| AppError::ModelError(format!("ONNX inference error: {e}")))?;

        let (output_shape, output_data) = outputs[0]
            .try_extract_tensor::<f32>()
            .map_err(|e| AppError::ModelError(format!("Failed to extract output tensor: {e}")))?;

        let dims: &[i64] = output_shape.as_ref();
        if dims.len() != 3 || dims[2] as usize != EMBEDDING_DIM {
            return Err(AppError::ModelError(format!(
                "Unexpected output shape: {dims:?}, expected [1, seq_len, {EMBEDDING_DIM}]"
            )));
        }

        let hidden_dim = EMBEDDING_DIM;
        let mut pooled = vec![0.0f32; hidden_dim];
        let mut sum_mask = 0.0f32;

        for (step, &mask_val) in mask.iter().enumerate().take(seq_len) {
            let m = mask_val as f32;
            sum_mask += m;
            let offset = step * hidden_dim;
            for (dim, item) in pooled.iter_mut().enumerate().take(hidden_dim) {
                *item += output_data[offset + dim] * m;
            }
        }

        if sum_mask > 0.0 {
            for item in pooled.iter_mut().take(hidden_dim) {
                *item /= sum_mask;
            }
        }

        l2_normalize(&mut pooled);

        Ok(pooled)
    }
}
