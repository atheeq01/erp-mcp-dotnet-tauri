use std::io::{self, Write};

pub trait Approver: Send + Sync {
    fn approve(&self, tool: &str, payload_json: &str, tainted: bool) -> bool;
}

pub struct ConsoleApprover;

impl Approver for ConsoleApprover {
    fn approve(&self, tool: &str, payload_json: &str, tainted: bool) -> bool {
        println!("\n\x1b[33m[APPROVAL REQUIRED] The agent wants to run mutating action: {tool}\x1b[0m");
        if tainted {
            println!("\x1b[31m  WARNING: Suspicious prompt injection instruction was detected earlier in this session!\x1b[0m");
        }
        println!("\x1b[36mPayload:\x1b[0m\n{payload_json}");
        print!("\nApprove or Reject [a/r]: ");
        let _ = io::stdout().flush();

        let mut input = String::new();
        if io::stdin().read_line(&mut input).is_err() {
            return false;
        }

        let trimmed = input.trim().to_lowercase();
        trimmed == "a" || trimmed == "approve" || trimmed == "y" || trimmed == "yes"
    }
}

pub struct FixedApprover(pub bool);

impl Approver for FixedApprover {
    fn approve(&self, _tool: &str, _payload_json: &str, _tainted: bool) -> bool {
        self.0
    }
}
