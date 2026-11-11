use crate::error::AppError;
use crate::models::tool::ToolDefinition;
use serde_json::Value;

pub fn validate_parameters(tool: &ToolDefinition, params: &Value) -> Result<(), AppError> {
    if !params.is_object() {
        return Err(AppError::ValidationError(
            "Tool parameters must be a JSON object.".into(),
        ));
    }

    let required = tool.required_parameters();
    for req_field in required {
        let val = params.get(&req_field);
        if val.is_none() || val == Some(&Value::Null) {
            return Err(AppError::ValidationError(format!(
                "Required parameter '{}' is missing for tool '{}'.",
                req_field, tool.name
            )));
        }
    }

    if params
        .get("password")
        .and_then(Value::as_str)
        .is_some_and(|p| p.len() < 8)
    {
        return Err(AppError::ValidationError(
            "Password must contain at least 8 characters.".into(),
        ));
    }

    if params
        .get("role")
        .and_then(Value::as_str)
        .is_some_and(|r| r != "Sales" && r != "Store")
    {
        return Err(AppError::ValidationError(
            "Role must be either 'Sales' or 'Store'.".into(),
        ));
    }

    if params
        .get("quantityAvailable")
        .and_then(Value::as_i64)
        .is_some_and(|q| q < 0)
    {
        return Err(AppError::ValidationError(
            "Quantity available cannot be negative.".into(),
        ));
    }

    if params
        .get("unitPrice")
        .and_then(Value::as_f64)
        .is_some_and(|p| p < 0.0)
    {
        return Err(AppError::ValidationError(
            "Unit price cannot be negative.".into(),
        ));
    }

    Ok(())
}
