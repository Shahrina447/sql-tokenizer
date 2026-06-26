from fastapi import APIRouter

from models import TokenizeRequest, ValidateRequest
from parser import Parser, SyntaxError_
from tokenizer import tokenize

router = APIRouter()


@router.post("/tokenize")
def tokenize_query(req: TokenizeRequest):
    tokens = tokenize(req.query)
    token_dicts = [t.to_dict() for t in tokens]

    type_counts: dict[str, int] = {}
    for t in token_dicts:
        type_counts[t["type"]] = type_counts.get(t["type"], 0) + 1

    return {
        "tokens": token_dicts,
        "count": len(token_dicts),
        "type_counts": type_counts,
    }


@router.post("/validate")
def validate_query(req: ValidateRequest):
    tokens = tokenize(req.query)

    if not tokens:
        return {
            "valid": False,
            "errors": [{"message": "Empty query", "position": 0}],
            "steps": [],
            "tokens": [],
        }

    lex_errors = []
    clean_tokens = []
    for t in tokens:
        if t.type == "UNKNOWN":
            lex_errors.append({
                "message": f"Unknown character '{t.value}' at position {t.position} — this character is not valid in SQL.",
                "hint": f"Remove or replace the character '{t.value}'. SQL supports letters, numbers, operators like =, <, >, and quotes for strings.",
                "position": t.position,
                "error_type": "Lexical Error",
            })
        else:
            clean_tokens.append(t)

    if lex_errors:
        return {
            "valid": False,
            "errors": lex_errors,
            "steps": ["Lexical analysis failed — one or more invalid characters were found in the query."],
            "tokens": [t.to_dict() for t in tokens],
        }

    parser = Parser(clean_tokens)
    steps = [
        "Lexical analysis complete — no unknown characters found",
        "Starting syntax analysis...",
    ]
    try:
        parser.parse()
        steps += parser.steps
        return {
            "valid": True,
            "errors": [],
            "steps": steps,
            "tokens": [t.to_dict() for t in tokens],
        }
    except SyntaxError_ as e:
        steps += parser.steps
        return {
            "valid": False,
            "errors": [{
                "message": str(e),
                "hint": e.hint,
                "position": e.position,
                "error_type": e.error_type,
            }],
            "steps": steps,
            "tokens": [t.to_dict() for t in tokens],
        }
    except Exception as e:
        steps += parser.steps
        return {
            "valid": False,
            "errors": [{
                "message": f"An unexpected error occurred: {str(e)}",
                "hint": "This may be an internal error. Check that your query is a valid SQL SELECT, INSERT, UPDATE, or DELETE statement.",
                "position": -1,
                "error_type": "Internal Error",
            }],
            "steps": steps,
            "tokens": [t.to_dict() for t in tokens],
        }


@router.get("/examples")
def get_examples():
    return {
        "examples": [
            {
                "label": "Simple SELECT",
                "query": "SELECT id, name, age FROM students WHERE age > 18 ORDER BY name ASC",
            },
            {
                "label": "SELECT with aggregate",
                "query": "SELECT COUNT(*), AVG(salary) FROM employees WHERE department = 'Engineering'",
            },
            {
                "label": "INSERT",
                "query": "INSERT INTO students (id, name, age) VALUES (1, 'Alice', 21)",
            },
            {
                "label": "UPDATE with WHERE",
                "query": "UPDATE employees SET salary = 75000, department = 'HR' WHERE id = 5",
            },
            {
                "label": "DELETE",
                "query": "DELETE FROM orders WHERE status = 'cancelled' AND total < 100",
            },
            {
                "label": "SELECT DISTINCT",
                "query": "SELECT DISTINCT department FROM employees ORDER BY department ASC",
            },
        ]
    }


@router.get("/health")
def health():
    return {"status": "ok"}
