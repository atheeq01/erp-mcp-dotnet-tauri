use crate::models::intent::{IntentAction, IntentEntity};
use regex::Regex;

pub struct RegexPatterns {
    query_action: Regex,
    create_action: Regex,
    update_action: Regex,
    deactivate_action: Regex,
    order_entity: Regex,
    inventory_entity: Regex,
    user_entity: Regex,
    negation_mutation: Regex,
}

impl RegexPatterns {
    pub fn new() -> Self {
        Self {
            query_action: Regex::new(
                r"\b(get|list|show|view|find|display|fetch|check|inspect|what|which)\b",
            )
            .expect("Valid query regex"),
            create_action: Regex::new(
                r"\b(create|add|make|register|insert|new|record|place)\b",
            )
            .expect("Valid create regex"),
            update_action: Regex::new(
                r"\b(update|edit|change|modify|adjust|set)\b",
            )
            .expect("Valid update regex"),
            deactivate_action: Regex::new(
                r"\b(deactivate|delete|remove|disable|destroy|drop)\b",
            )
            .expect("Valid deactivate regex"),
            order_entity: Regex::new(
                r"\b(order|orders|purchase|sale|sales)\b",
            )
            .expect("Valid order regex"),
            inventory_entity: Regex::new(
                r"\b(inventory|product|products|stock|item|items|sku|skus)\b",
            )
            .expect("Valid inventory regex"),
            user_entity: Regex::new(
                r"\b(user|users|employee|employees|staff|account|accounts|worker)\b",
            )
            .expect("Valid user regex"),
            negation_mutation: Regex::new(
                r"\b(do\s+not|don't|dont|never|stop)\s+(delete|remove|deactivate|create|add|make|update|modify|change)\b",
            )
            .expect("Valid negation mutation regex"),
        }
    }

    pub fn match_action(&self, text: &str) -> IntentAction {
        if self.deactivate_action.is_match(text) {
            return IntentAction::Deactivate;
        }
        if self.update_action.is_match(text) {
            return IntentAction::Update;
        }
        if self.create_action.is_match(text) {
            return IntentAction::Create;
        }
        if self.query_action.is_match(text) {
            return IntentAction::Query;
        }
        IntentAction::Unknown
    }

    pub fn match_entity(&self, text: &str) -> IntentEntity {
        if self.order_entity.is_match(text) {
            return IntentEntity::Order;
        }
        if self.inventory_entity.is_match(text) {
            return IntentEntity::Inventory;
        }
        if self.user_entity.is_match(text) {
            return IntentEntity::User;
        }
        IntentEntity::Unknown
    }

    pub fn matches_negation_mutation(&self, text: &str) -> bool {
        self.negation_mutation.is_match(text)
    }
}

impl Default for RegexPatterns {
    fn default() -> Self {
        Self::new()
    }
}
