use crate::models::intent::{IntentAction, IntentEntity};
use regex::Regex;

pub struct RegexPatterns {
    query_action: Regex,
    create_action: Regex,
    update_action: Regex,
    deactivate_action: Regex,
    order_entity: Regex,
    order_number: Regex,
    who_creator: Regex,
    last_order: Regex,
    inventory_entity: Regex,
    user_entity: Regex,
    negation_mutation: Regex,
}

impl RegexPatterns {
    pub fn new() -> Self {
        Self {
            query_action: Regex::new(
                r"\b(get|list|show|view|find|display|fetch|check|inspect|what|which|who|search|available|availability|have|has|got)\b",
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
            order_number: Regex::new(r"(?i)\bord-[a-z0-9-]+\b").expect("Valid order number regex"),
            who_creator: Regex::new(r"(?i)\bwho\b").expect("Valid who regex"),
            last_order: Regex::new(r"(?i)\b(last|latest|most\s+recent|recent)\s+orders?\b")
                .expect("Valid last order regex"),
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

    pub fn is_order_lookup_question(&self, text: &str) -> bool {
        if self.order_number.is_match(text) {
            return true;
        }
        (self.who_creator.is_match(text) || self.last_order.is_match(text))
            && self.order_entity.is_match(text)
    }

    pub fn match_action(&self, text: &str) -> IntentAction {
        if self.is_order_lookup_question(text) {
            return IntentAction::Query;
        }
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
        if self.order_entity.is_match(text) || self.order_number.is_match(text) {
            return IntentEntity::Order;
        }
        if self.user_entity.is_match(text) {
            return IntentEntity::User;
        }
        if self.inventory_entity.is_match(text)
            || text.contains('"')
            || text.contains('\'')
            || text.contains("available")
            || text.contains("stock")
        {
            return IntentEntity::Inventory;
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
