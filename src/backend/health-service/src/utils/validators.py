from typing import Dict, Tuple, Any
import re
import html
from pydantic import ValidationError  # version: ^2.0.0
from models.questionnaire import QUESTION_TYPES  # version: internal

# Validation constants with enhanced security patterns
NUMERIC_REGEX = r'^-?\d+(\.\d{1,2})?$'
DATE_REGEX = r'^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$'
CPF_REGEX = r'^([0-9]{3}\.){2}[0-9]{3}-[0-9]{2}$'
MAX_TEXT_LENGTH = 1000
MIN_AGE = 0
MAX_AGE = 120
VALIDATION_TIMEOUT = 5
MAX_CHOICES = 10
RESTRICTED_CHARS = r'[<>&"/]'

def validate_question_type(question_type: str) -> bool:
    """
    Validates if the question type is supported and properly configured.
    
    Args:
        question_type: The type of question to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    if not question_type or not isinstance(question_type, str):
        return False
    
    return question_type in QUESTION_TYPES

def validate_text_response(text: str) -> Tuple[bool, str]:
    """
    Validates and sanitizes text responses with enhanced security checks.
    
    Args:
        text: The text response to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not text or not isinstance(text, str):
        return False, "Resposta de texto é obrigatória"
    
    if len(text) > MAX_TEXT_LENGTH:
        return False, f"Texto excede o limite máximo de {MAX_TEXT_LENGTH} caracteres"
    
    # Check for restricted characters
    if re.search(RESTRICTED_CHARS, text):
        return False, "Texto contém caracteres não permitidos"
    
    # Apply HTML escaping
    sanitized_text = html.escape(text)
    
    # Check for common XSS patterns
    xss_patterns = [
        r'<script',
        r'javascript:',
        r'onerror=',
        r'onload=',
        r'eval\(',
    ]
    
    for pattern in xss_patterns:
        if re.search(pattern, text.lower()):
            return False, "Texto contém padrões não permitidos"
    
    if sanitized_text != text:
        return False, "Texto contém caracteres HTML não permitidos"
    
    return True, ""

def validate_numeric_response(value: str, validation_rules: Dict) -> Tuple[bool, str]:
    """
    Validates numeric responses with range checking and precision control.
    
    Args:
        value: The numeric value to validate
        validation_rules: Dictionary containing validation rules
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not value:
        return False, "Valor numérico é obrigatório"
    
    if not re.match(NUMERIC_REGEX, str(value)):
        return False, "Formato numérico inválido. Use até 2 casas decimais"
    
    try:
        num_value = float(value)
        
        # Apply validation rules
        if "min_value" in validation_rules and num_value < validation_rules["min_value"]:
            return False, f"Valor deve ser maior ou igual a {validation_rules['min_value']}"
            
        if "max_value" in validation_rules and num_value > validation_rules["max_value"]:
            return False, f"Valor deve ser menor ou igual a {validation_rules['max_value']}"
            
        # Validate medical ranges if specified
        if "medical_range" in validation_rules:
            range_min = validation_rules["medical_range"]["min"]
            range_max = validation_rules["medical_range"]["max"]
            if not (range_min <= num_value <= range_max):
                return False, f"Valor fora do intervalo médico permitido ({range_min} - {range_max})"
        
        return True, ""
        
    except ValueError:
        return False, "Valor numérico inválido"

def validate_cpf(cpf: str) -> Tuple[bool, str]:
    """
    Validates Brazilian CPF with format and checksum verification.
    
    Args:
        cpf: The CPF number to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not cpf:
        return False, "CPF é obrigatório"
    
    if not re.match(CPF_REGEX, cpf):
        return False, "Formato de CPF inválido. Use XXX.XXX.XXX-XX"
    
    # Remove formatting for processing
    numbers = [int(digit) for digit in cpf if digit.isdigit()]
    
    # Validate length
    if len(numbers) != 11:
        return False, "CPF deve conter 11 dígitos"
    
    # Check for known invalid sequences
    if len(set(numbers)) == 1:
        return False, "CPF inválido"
    
    # Validate first check digit
    sum_of_products = sum(a * b for a, b in zip(numbers[0:9], range(10, 1, -1)))
    expected_digit = (sum_of_products * 10 % 11) % 10
    if numbers[9] != expected_digit:
        return False, "CPF inválido"
    
    # Validate second check digit
    sum_of_products = sum(a * b for a, b in zip(numbers[0:10], range(11, 1, -1)))
    expected_digit = (sum_of_products * 10 % 11) % 10
    if numbers[10] != expected_digit:
        return False, "CPF inválido"
    
    return True, ""

def validate_date(date: str) -> Tuple[bool, str]:
    """
    Validates date format, range, and age restrictions.
    
    Args:
        date: The date string to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not date:
        return False, "Data é obrigatória"
    
    if not re.match(DATE_REGEX, date):
        return False, "Formato de data inválido. Use AAAA-MM-DD"
    
    try:
        year, month, day = map(int, date.split('-'))
        
        # Validate month days
        days_in_month = {
            1: 31, 2: 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
            3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
        }
        
        if day > days_in_month[month]:
            return False, "Dia inválido para o mês especificado"
        
        # Validate not future date
        from datetime import datetime
        if datetime(year, month, day) > datetime.now():
            return False, "Data não pode ser futura"
        
        # Validate age if birthdate
        if "birthdate" in date.lower():
            from datetime import date as date_type
            today = date_type.today()
            age = today.year - year - ((today.month, today.day) < (month, day))
            
            if not (MIN_AGE <= age <= MAX_AGE):
                return False, f"Idade deve estar entre {MIN_AGE} e {MAX_AGE} anos"
        
        return True, ""
        
    except ValueError:
        return False, "Data inválida"

def sanitize_text(text: str) -> str:
    """
    Sanitizes text input with enhanced security measures.
    
    Args:
        text: The text to sanitize
        
    Returns:
        str: Sanitized text
    """
    if not text:
        return ""
    
    # Remove HTML tags
    text = re.sub(r'<[^>]*>', '', text)
    
    # Escape special characters
    text = html.escape(text)
    
    # Remove potential script patterns
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    # Validate character encoding
    try:
        text.encode('utf-8').decode('utf-8')
    except UnicodeError:
        return ""
    
    return text