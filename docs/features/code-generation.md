# Code Generation

voide excels at generating code from natural language descriptions. This guide covers techniques for effective code generation using voice commands.

## Basic Code Generation

### Simple Requests

Describe what you want in plain language:

```text
"Create a function that reverses a string"
```

Claude responds:

```typescript
function reverseString(str: string): string {
  return str.split('').reverse().join('')
}
```

### Specifying Language

Be explicit about the language:

```text
"Write a Python function to calculate factorial"
```

```python
def factorial(n: int) -> int:
    if n <= 1:
        return 1
    return n * factorial(n - 1)
```

### Adding Requirements

Include specific requirements:

```text
"Create a TypeScript function to validate email addresses
using regex with proper error messages"
```

```typescript
interface ValidationResult {
  valid: boolean
  error?: string
}

function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }

  return { valid: true }
}
```

## Structured Prompts

### Components and Classes

```text
"Create a React component for a toggle switch
with on and off states
that accepts a label and onChange callback"
```

```tsx
interface ToggleSwitchProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleSwitch({ label, checked, onChange }: ToggleSwitchProps) {
  return (
    <label className="toggle-switch">
      <span className="label">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="slider" />
    </label>
  )
}
```

### API Endpoints

```text
"Create an Express route for user registration
that validates email and password
and returns a JWT token"
```

### Database Models

```text
"Create a Prisma schema for a blog
with users posts and comments
where users can have many posts
and posts can have many comments"
```

## Iterative Development

### Building Step by Step

Start simple and add complexity:

```text
Step 1: "Create a basic todo item interface"
Step 2: "Add a priority field with high medium and low values"
Step 3: "Add a due date field that's optional"
Step 4: "Add a tags array"
```

### Modifying Generated Code

Build on previous responses:

```text
You: "Create a function to fetch user data"
Claude: [provides fetch function]

You: "Add error handling with try catch"
Claude: [adds error handling]

You: "Add retry logic with exponential backoff"
Claude: [adds retry logic]

You: "Add TypeScript types"
Claude: [adds types]
```

### Refactoring

Ask for improvements:

```text
"Refactor this to use async await instead of promises"
"Make this more readable by extracting helper functions"
"Optimize this for better performance"
```

## Code Patterns

### Common Patterns

Request specific patterns:

```text
"Create a singleton pattern for database connection"
"Write a factory function for creating user objects"
"Implement the observer pattern for event handling"
```

### Framework-Specific

Mention frameworks for idiomatic code:

```text
"Create a Vue 3 composable for form validation"
"Write a Next.js API route with middleware"
"Create a NestJS service with dependency injection"
```

### Testing

Generate tests alongside code:

```text
"Create a function to calculate discounts
and include unit tests using Jest"
```

## Best Practices for Prompts

### Be Specific

Instead of:

```text
"Create a login function"
```

Say:

```text
"Create a login function that takes email and password
validates both fields
calls the auth API
stores the token in local storage
and handles errors with specific messages"
```

### Provide Context

```text
"In my React app with TypeScript and Tailwind
create a dropdown menu component
that supports keyboard navigation
and closes when clicking outside"
```

### Specify Quality

```text
"Create a production-ready function
with proper error handling
TypeScript types
and JSDoc comments"
```

## Voice-Friendly Techniques

### Spoken Code Structure

Use natural phrases for code structure:

```text
"Create a function called calculate total
that takes an array of items
each item has a price and quantity
return the sum of price times quantity for all items"
```

### Describing Types

```text
"Create an interface called user
with string name
string email
optional number age
and an array of strings called roles"
```

Result:

```typescript
interface User {
  name: string
  email: string
  age?: number
  roles: string[]
}
```

### Describing Logic

```text
"If the user is logged in
and has admin role
show the admin panel
otherwise show the login prompt"
```

## Advanced Generation

### Multi-File Generation

```text
"Create a full CRUD API for products
including the model
routes
controller
and service layer"
```

### With Configuration

```text
"Create an ESLint configuration
for TypeScript React projects
with Prettier integration
and strict type checking"
```

### Documentation

```text
"Create README documentation
for a REST API
with installation instructions
environment variables
and endpoint examples"
```

## Code Snippets Library

### Saving Snippets

Save frequently used code:

```text
Voice: "Save this as email validation snippet"
```

### Using Snippets

```text
Voice: "Insert the email validation snippet"
```

### Managing Snippets

```ts
import { saveSnippet, getSnippet, listSnippets } from 'voide'

// Save a snippet
saveSnippet('fetchWithRetry', codeString)

// Get a snippet
const code = getSnippet('fetchWithRetry')

// List all snippets
const snippets = listSnippets()
```

## Integration with Editor

### VS Code Integration

When using voide with VS Code:

```text
"Insert a new function after line 25"
"Replace the selected code with a better implementation"
"Add imports at the top of the file"
```

### Cursor Position

```text
"Create a helper function and insert it here"
"Add this interface above the component"
```

## Error Handling in Generated Code

### Requesting Error Handling

```text
"Add comprehensive error handling
with specific error types
and meaningful error messages"
```

### Validation

```text
"Add input validation
that checks for null undefined and empty strings
and throws descriptive errors"
```

## Performance Considerations

### Optimized Code

```text
"Generate a performant implementation
that minimizes memory allocation
and avoids unnecessary iterations"
```

### Big O Complexity

```text
"Create a search function
with O log n time complexity
using binary search"
```

## Next Steps

- [Real-time Transcription](/features/real-time-transcription) - Improve voice accuracy
- [AI Integration](/features/ai-integration) - Optimize AI responses
- [Custom Commands](/advanced/custom-commands) - Create code generation commands
