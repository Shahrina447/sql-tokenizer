from typing import List, Optional

from tokenizer import Token, AGGREGATE_FUNCTIONS


class SyntaxError_(Exception):
    def __init__(self, message: str, position: Optional[int] = None, hint: Optional[str] = None, error_type: Optional[str] = None):
        super().__init__(message)
        self.position = position
        self.msg = message
        self.hint = hint
        self.error_type = error_type or "Syntax Error"


class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0
        self.errors = []
        self.steps = []

    def current(self) -> Optional[Token]:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def peek(self, offset: int = 1) -> Optional[Token]:
        idx = self.pos + offset
        if idx < len(self.tokens):
            return self.tokens[idx]
        return None

    def consume(self, expected_value=None, expected_type=None) -> Optional[Token]:
        tok = self.current()
        if tok is None:
            # Provide context-aware end-of-query messages
            if expected_value:
                hint = self._hint_for_missing_keyword(expected_value)
                raise SyntaxError_(
                    f"Query ended unexpectedly — missing '{expected_value}'.",
                    -1,
                    hint=hint,
                    error_type="Incomplete Query",
                )
            else:
                raise SyntaxError_(
                    f"Query ended unexpectedly — expected a {expected_type or 'token'} but the query is incomplete.",
                    -1,
                    hint="Make sure your query is complete and not cut off.",
                    error_type="Incomplete Query",
                )
        if expected_value and tok.value.upper() != expected_value.upper():
            msg, hint, etype = self._meaningful_error(expected_value, tok)
            raise SyntaxError_(msg, tok.position, hint=hint, error_type=etype)
        if expected_type and tok.type != expected_type:
            msg, hint, etype = self._meaningful_type_error(expected_type, tok)
            raise SyntaxError_(msg, tok.position, hint=hint, error_type=etype)
        self.pos += 1
        return tok

    def _hint_for_missing_keyword(self, keyword: str) -> str:
        hints = {
            "FROM": "Every SELECT statement needs a FROM clause. Example: SELECT name FROM students",
            "INTO": "INSERT requires INTO. Example: INSERT INTO tablename (col) VALUES (val)",
            "VALUES": "INSERT requires a VALUES clause. Example: INSERT INTO t (col) VALUES ('data')",
            "SET": "UPDATE requires a SET clause. Example: UPDATE t SET col = value",
            "BY": "ORDER BY and GROUP BY both need the BY keyword.",
            "WHERE": "A WHERE clause filter was expected here.",
            "AND": "BETWEEN requires AND. Example: age BETWEEN 18 AND 30",
            "NULL": "IS or IS NOT must be followed by NULL. Example: WHERE col IS NULL",
        }
        return hints.get(keyword.upper(), f"'{keyword}' is required at this point in the query.")

    def _meaningful_error(self, expected: str, found: Token):
        e = expected.upper()
        f = found.value

        if e == "FROM":
            return (
                f"Missing FROM keyword after column list — found '{f}' instead.",
                "SELECT must be followed by a column list, then FROM. Example: SELECT id, name FROM students",
                "Missing Keyword",
            )
        if e == "INTO":
            return (
                f"Missing INTO after INSERT — found '{f}' instead.",
                "Correct syntax: INSERT INTO tablename (columns) VALUES (values)",
                "Missing Keyword",
            )
        if e == "VALUES":
            return (
                f"Missing VALUES keyword — found '{f}' instead.",
                "After listing the columns in INSERT, you need VALUES (...). Example: INSERT INTO t (col) VALUES ('x')",
                "Missing Keyword",
            )
        if e == "SET":
            return (
                f"Missing SET keyword in UPDATE — found '{f}' instead.",
                "Correct syntax: UPDATE tablename SET column = value WHERE condition",
                "Missing Keyword",
            )
        if e == "BY":
            return (
                f"Expected BY after ORDER/GROUP but found '{f}'.",
                "Use ORDER BY or GROUP BY — not just ORDER or GROUP alone.",
                "Missing Keyword",
            )
        if e == "AND":
            return (
                f"BETWEEN requires AND to complete the range — found '{f}' instead.",
                "Correct syntax: column BETWEEN value1 AND value2. Example: age BETWEEN 18 AND 30",
                "Missing Keyword",
            )
        if e == "NULL":
            return (
                f"IS / IS NOT must be followed by NULL — found '{f}' instead.",
                "Correct syntax: WHERE column IS NULL  or  WHERE column IS NOT NULL",
                "Invalid Condition",
            )
        if e == "WHERE":
            return (
                f"Expected WHERE but found '{f}'.",
                "A WHERE clause starts with the keyword WHERE. Example: WHERE id = 1",
                "Missing Keyword",
            )
        if e in ("(", ")"):
            return (
                f"Expected '{e}' but found '{f}' at position {found.position}.",
                "Check that all parentheses are properly opened and closed.",
                "Mismatched Parentheses",
            )
        return (
            f"Expected keyword '{expected}' but found '{f}' at position {found.position}.",
            f"'{expected}' is required here. Check your query structure.",
            "Syntax Error",
        )

    def _meaningful_type_error(self, expected_type: str, found: Token):
        f = found.value
        pos = found.position

        if expected_type == "IDENTIFIER":
            if found.type == "KEYWORD":
                return (
                    f"'{f}' is a reserved SQL keyword and cannot be used as a table or column name (position {pos}).",
                    f"Rename your column/table to avoid reserved words like '{f}'. If intentional, use an alias.",
                    "Reserved Keyword Used as Name",
                )
            return (
                f"Expected a table or column name but found '{f}' (type: {found.type}) at position {pos}.",
                "A table or column name (identifier) is required here. Example: SELECT name FROM students",
                "Missing Identifier",
            )
        if expected_type == "NUMBER":
            return (
                f"Expected a number but found '{f}' (type: {found.type}) at position {pos}.",
                "A numeric value is required here. Example: LIMIT 10 or TOP 5",
                "Invalid Number",
            )
        if expected_type == "PUNCTUATION":
            return (
                f"Expected punctuation but found '{f}' at position {pos}.",
                "Check for missing commas, parentheses, or semicolons in your query.",
                "Missing Punctuation",
            )
        return (
            f"Expected {expected_type} but found '{f}' ({found.type}) at position {pos}.",
            f"A {expected_type} token is required at this position.",
            "Type Mismatch",
        )

    def match(self, value=None, type_=None) -> bool:
        tok = self.current()
        if tok is None:
            return False
        if value and type_:
            return tok.value.upper() == value.upper() and tok.type == type_
        if value:
            return tok.value.upper() == value.upper()
        if type_:
            return tok.type == type_
        return False

    def add_step(self, msg: str):
        self.steps.append(msg)

    # ── Expression parsing ──────────────────────────────────────────────────

    def parse_value(self):
        """Parse a single value: identifier, number, string, or NULL."""
        tok = self.current()
        if tok is None:
            raise SyntaxError_(
                "Expected a value (column name, number, or string) but the query ended unexpectedly.",
                -1,
                hint="Make sure your expression or condition is complete.",
                error_type="Incomplete Expression",
            )
        if tok.type in ("IDENTIFIER", "NUMBER", "STRING", "WILDCARD"):
            self.pos += 1
            return tok
        if tok.type == "KEYWORD" and tok.value == "NULL":
            self.pos += 1
            return tok
        # aggregate function call
        if tok.type in ("KEYWORD", "AGGREGATE_FUNCTION") and tok.value in AGGREGATE_FUNCTIONS:
            self.pos += 1
            self.consume("(", "PUNCTUATION")
            if self.match("*", "OPERATOR") or self.match("*", "WILDCARD"):
                self.pos += 1
            else:
                self.parse_value()
            self.consume(")", "PUNCTUATION")
            return tok
        if tok.type == "KEYWORD":
            raise SyntaxError_(
                f"'{tok.value}' is a reserved SQL keyword and cannot be used as a value here (position {tok.position}).",
                tok.position,
                hint=f"If you meant to use '{tok.value}' as a column name or alias, rename it to avoid reserved keywords.",
                error_type="Reserved Keyword as Value",
            )
        raise SyntaxError_(
            f"Unexpected token '{tok.value}' (type: {tok.type}) at position {tok.position} — a value was expected.",
            tok.position,
            hint="A value should be a column name, a number, or a quoted string like 'Alice'.",
            error_type="Unexpected Token",
        )

    def parse_column_expr(self):
        """column [AS alias] | aggregate(...) [AS alias]"""
        tok = self.current()
        if tok is None:
            raise SyntaxError_("Expected column but reached end of query", -1)
        if tok.type in ("OPERATOR", "WILDCARD") and tok.value == "*":
            self.pos += 1
            return
        self.parse_value()
        # optional dot notation: table.column
        if self.match(".", "PUNCTUATION"):
            self.pos += 1
            self.parse_value()
        # optional alias
        if self.match("AS"):
            self.pos += 1
            self.consume(expected_type="IDENTIFIER")

    def parse_column_list(self):
        """col1, col2, ..."""
        self.parse_column_expr()
        while self.match(",", "PUNCTUATION"):
            self.pos += 1
            self.parse_column_expr()

    def parse_condition(self):
        """col OP value | col IS [NOT] NULL | col BETWEEN val AND val | col IN (...)"""
        self.parse_value()

        tok = self.current()
        if tok is None:
            raise SyntaxError_(
                "Condition is incomplete — an operator is required after the column name.",
                -1,
                hint="A condition needs an operator. Example: WHERE age > 18 or WHERE name = 'Alice'",
                error_type="Incomplete Condition",
            )

        if tok.value.upper() == "IS":
            self.pos += 1
            if self.match("NOT"):
                self.pos += 1
            self.consume("NULL")
            return

        if tok.value.upper() == "BETWEEN":
            self.pos += 1
            self.parse_value()
            self.consume("AND")
            self.parse_value()
            return

        if tok.value.upper() == "IN":
            self.pos += 1
            self.consume("(", "PUNCTUATION")
            self.parse_value()
            while self.match(",", "PUNCTUATION"):
                self.pos += 1
                self.parse_value()
            self.consume(")", "PUNCTUATION")
            return

        if tok.value.upper() == "LIKE":
            self.pos += 1
            self.parse_value()
            return

        if tok.type == "OPERATOR":
            self.pos += 1
            self.parse_value()
            return

        raise SyntaxError_(
            f"Invalid operator '{tok.value}' in condition at position {tok.position}.",
            tok.position,
            hint="Valid operators are: =, <>, !=, <, >, <=, >=, LIKE, IN, BETWEEN, IS NULL. Example: WHERE age >= 18",
            error_type="Invalid Operator",
        )

    def parse_where_clause(self):
        self.add_step("Parsing WHERE clause")
        self.consume("WHERE")
        self.parse_condition()
        while self.match("AND") or self.match("OR"):
            self.pos += 1
            self.parse_condition()

    def parse_order_by(self):
        self.add_step("Parsing ORDER BY clause")
        self.consume("ORDER")
        self.consume("BY")
        self.parse_value()
        if self.match("ASC") or self.match("DESC"):
            self.pos += 1
        while self.match(",", "PUNCTUATION"):
            self.pos += 1
            self.parse_value()
            if self.match("ASC") or self.match("DESC"):
                self.pos += 1

    def parse_group_by(self):
        self.add_step("Parsing GROUP BY clause")
        self.consume("GROUP")
        self.consume("BY")
        self.parse_value()
        while self.match(",", "PUNCTUATION"):
            self.pos += 1
            self.parse_value()
        if self.match("HAVING"):
            self.pos += 1
            self.parse_condition()

    def parse_limit(self):
        self.add_step("Parsing LIMIT clause")
        self.consume("LIMIT")
        self.consume(expected_type="NUMBER")
        if self.match("OFFSET"):
            self.pos += 1
            self.consume(expected_type="NUMBER")

    # ── Statement parsers ───────────────────────────────────────────────────

    def parse_select(self):
        self.add_step("Detected SELECT statement")
        self.consume("SELECT")
        if self.match("DISTINCT"):
            self.pos += 1
        if self.match("TOP"):
            self.pos += 1
            self.consume(expected_type="NUMBER")
        self.add_step("Parsing SELECT column list")
        self.parse_column_list()
        self.add_step("Parsing FROM clause")
        self.consume("FROM")
        self.consume(expected_type="IDENTIFIER")
        # optional table alias
        if self.current() and self.current().type == "IDENTIFIER":
            self.pos += 1
        if self.match("WHERE"):
            self.parse_where_clause()
        if self.match("GROUP"):
            self.parse_group_by()
        if self.match("ORDER"):
            self.parse_order_by()
        if self.match("LIMIT"):
            self.parse_limit()
        self.add_step("SELECT statement parsed successfully")

    def parse_insert(self):
        self.add_step("Detected INSERT statement")
        self.consume("INSERT")
        self.consume("INTO")
        self.consume(expected_type="IDENTIFIER")
        if self.match("(", "PUNCTUATION"):
            self.pos += 1
            self.add_step("Parsing column list in INSERT")
            self.consume(expected_type="IDENTIFIER")
            while self.match(",", "PUNCTUATION"):
                self.pos += 1
                self.consume(expected_type="IDENTIFIER")
            self.consume(")", "PUNCTUATION")
        self.add_step("Parsing VALUES clause")
        self.consume("VALUES")
        self.consume("(", "PUNCTUATION")
        self.parse_value()
        while self.match(",", "PUNCTUATION"):
            self.pos += 1
            self.parse_value()
        self.consume(")", "PUNCTUATION")
        self.add_step("INSERT statement parsed successfully")

    def parse_update(self):
        self.add_step("Detected UPDATE statement")
        self.consume("UPDATE")
        self.consume(expected_type="IDENTIFIER")
        self.add_step("Parsing SET clause")
        self.consume("SET")
        self.consume(expected_type="IDENTIFIER")
        self.consume("=", "OPERATOR")
        self.parse_value()
        while self.match(",", "PUNCTUATION"):
            self.pos += 1
            self.consume(expected_type="IDENTIFIER")
            self.consume("=", "OPERATOR")
            self.parse_value()
        if self.match("WHERE"):
            self.parse_where_clause()
        self.add_step("UPDATE statement parsed successfully")

    def parse_delete(self):
        self.add_step("Detected DELETE statement")
        self.consume("DELETE")
        self.consume("FROM")
        self.consume(expected_type="IDENTIFIER")
        if self.match("WHERE"):
            self.parse_where_clause()
        self.add_step("DELETE statement parsed successfully")

    def parse(self):
        tok = self.current()
        if tok is None:
            raise SyntaxError_(
                "Empty query — please enter a SQL statement.",
                0,
                hint="Start with SELECT, INSERT, UPDATE, or DELETE.",
                error_type="Empty Query",
            )
        kw = tok.value.upper()
        if kw == "SELECT":
            self.parse_select()
        elif kw == "INSERT":
            self.parse_insert()
        elif kw == "UPDATE":
            self.parse_update()
        elif kw == "DELETE":
            self.parse_delete()
        else:
            raise SyntaxError_(
                f"'{tok.value}' is not a valid SQL statement start (position {tok.position}).",
                tok.position,
                hint="A SQL query must begin with SELECT, INSERT, UPDATE, or DELETE.",
                error_type="Unknown Statement",
            )
        # Trailing content check (allow optional semicolon)
        remaining = self.current()
        if remaining and not (remaining.type == "PUNCTUATION" and remaining.value == ";"):
            raise SyntaxError_(
                f"Unexpected token '{remaining.value}' at position {remaining.position} — the statement appears to have already ended.",
                remaining.position,
                hint="There may be extra text after a complete statement, or a clause is placed in the wrong order.",
                error_type="Unexpected Trailing Token",
            )
