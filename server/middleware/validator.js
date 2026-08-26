/**
 * Strict Input Schema Validation Engine
 * Validates request body, query parameters, and route parameters against exact types, lengths, and formats.
 * Rejects invalid, out-of-bounds, or unexpected inputs with HTTP 400 Bad Request.
 */

// Regular expression patterns for common formats
export const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
  PHONE: /^[+]?[0-9\s\-()]{7,25}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  URL: /^(https?:\/\/|\/)[^\s$.?#].[^\s]*$/i,
  PASSWORD: /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,128}$/,
};

/**
 * Validate a single value against a field specification
 */
function validateField(fieldName, value, spec) {
  const errors = [];

  // Check required
  if (value === undefined || value === null || value === '') {
    if (spec.required) {
      errors.push(`${fieldName} is required.`);
    }
    return errors;
  }

  // Type checks
  switch (spec.type) {
    case 'string': {
      if (typeof value !== 'string') {
        errors.push(`${fieldName} must be a text string.`);
        return errors;
      }
      const trimmed = spec.trim !== false ? value.trim() : value;
      if (spec.required && trimmed.length === 0) {
        errors.push(`${fieldName} cannot be empty.`);
        return errors;
      }
      if (spec.minLength !== undefined && trimmed.length < spec.minLength) {
        errors.push(`${fieldName} must be at least ${spec.minLength} characters long.`);
      }
      if (spec.maxLength !== undefined && trimmed.length > spec.maxLength) {
        errors.push(`${fieldName} cannot exceed ${spec.maxLength} characters.`);
      }
      if (spec.pattern && !spec.pattern.test(trimmed)) {
        errors.push(spec.patternMessage || `${fieldName} has an invalid format.`);
      }
      if (spec.enum && !spec.enum.includes(trimmed)) {
        errors.push(`${fieldName} must be one of: ${spec.enum.join(', ')}.`);
      }
      break;
    }

    case 'number': {
      const num = Number(value);
      if (typeof value === 'boolean' || isNaN(num)) {
        errors.push(`${fieldName} must be a valid number.`);
        return errors;
      }
      if (spec.min !== undefined && num < spec.min) {
        errors.push(`${fieldName} must be at least ${spec.min}.`);
      }
      if (spec.max !== undefined && num > spec.max) {
        errors.push(`${fieldName} cannot exceed ${spec.max}.`);
      }
      break;
    }

    case 'integer': {
      const num = Number(value);
      if (typeof value === 'boolean' || isNaN(num) || !Number.isInteger(num)) {
        errors.push(`${fieldName} must be a valid integer.`);
        return errors;
      }
      if (spec.min !== undefined && num < spec.min) {
        errors.push(`${fieldName} must be at least ${spec.min}.`);
      }
      if (spec.max !== undefined && num > spec.max) {
        errors.push(`${fieldName} cannot exceed ${spec.max}.`);
      }
      break;
    }

    case 'boolean': {
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        errors.push(`${fieldName} must be a boolean (true/false).`);
      }
      break;
    }

    case 'array': {
      if (!Array.isArray(value)) {
        errors.push(`${fieldName} must be an array list.`);
        return errors;
      }
      if (spec.minItems !== undefined && value.length < spec.minItems) {
        errors.push(`${fieldName} must contain at least ${spec.minItems} item(s).`);
      }
      if (spec.maxItems !== undefined && value.length > spec.maxItems) {
        errors.push(`${fieldName} cannot contain more than ${spec.maxItems} item(s).`);
      }
      if (spec.items && value.length > 0) {
        value.forEach((item, index) => {
          if (spec.items.type === 'object' && spec.items.properties) {
            const nestedErrors = validateObject(`${fieldName}[${index}]`, item, spec.items);
            errors.push(...nestedErrors);
          } else {
            const nestedErrors = validateField(`${fieldName}[${index}]`, item, spec.items);
            errors.push(...nestedErrors);
          }
        });
      }
      break;
    }

    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${fieldName} must be an object.`);
        return errors;
      }
      if (spec.properties) {
        const nestedErrors = validateObject(fieldName, value, spec);
        errors.push(...nestedErrors);
      }
      break;
    }

    default:
      break;
  }

  return errors;
}

/**
 * Validate an entire object against a schema definition
 */
export function validateObject(parentName, obj, schema) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return [`${parentName || 'Request body'} must be an object.`];
  }

  const properties = schema.properties || {};
  const strict = schema.strict !== false; // Reject unknown keys by default

  // Check for unknown properties if strict mode is active
  if (strict) {
    const allowedKeys = new Set(Object.keys(properties));
    for (const key of Object.keys(obj)) {
      if (!allowedKeys.has(key)) {
        errors.push(`Unknown or disallowed property: '${parentName ? `${parentName}.${key}` : key}'.`);
      }
    }
  }

  // Validate each schema property
  for (const [key, spec] of Object.entries(properties)) {
    const val = obj[key];
    const fullFieldName = parentName ? `${parentName}.${key}` : key;
    const fieldErrors = validateField(fullFieldName, val, spec);
    errors.push(...fieldErrors);
  }

  return errors;
}

/**
 * Express Middleware factory for request body validation
 */
export function validateBody(schema) {
  return (req, res, next) => {
    if (!req.body || (typeof req.body === 'object' && Object.keys(req.body).length === 0 && schema.required)) {
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        message: 'Request body is empty or invalid.',
        details: ['Request body must contain valid JSON data.'],
      });
    }

    const errors = validateObject('', req.body, schema);
    if (errors.length > 0) {
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        message: errors[0],
        details: errors,
      });
    }

    next();
  };
}

/**
 * Express Middleware factory for query params validation
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const errors = validateObject('Query', req.query || {}, { ...schema, strict: false });
    if (errors.length > 0) {
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        message: errors[0],
        details: errors,
      });
    }
    next();
  };
}

/**
 * Express Middleware factory for route params validation
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const errors = validateObject('Parameter', req.params || {}, { ...schema, strict: false });
    if (errors.length > 0) {
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        message: errors[0],
        details: errors,
      });
    }
    next();
  };
}
