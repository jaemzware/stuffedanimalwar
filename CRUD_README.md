# Endpoint CRUD Manager

This CRUD manager allows you to update endpoint JSON configuration files through a web interface with password protection.

## Features

- **Password Protected** - Secure access with environment variable password
- **Session Management** - 24-hour token-based authentication
- **Load** existing endpoint configurations
- **Edit** all fields in the JSON structure
- **Validate** all resource paths (local files and HTTP URLs)
- **Save** changes with confirmation
- Field-level validation status indicators
- Supports dynamic arrays (animals, songs, photos, videos, responses)
- Collapsible sections for better organization
- Auto-scroll to validation messages

## Authentication Setup

### 1. Set Password in Environment

Add `CRUD_PASSWORD` to your `.env` file:

```bash
CRUD_PASSWORD=your_secure_password_here
```

If not set, the default password is `admin`.

### 2. Access

Once the server is running, access the CRUD manager at:

```
https://localhost:55556/crud
```

### 3. Login

1. Enter the password from your `CRUD_PASSWORD` environment variable
2. Press Enter or click the Login button
3. Your session will remain active for 24 hours
4. Session persists in browser until you close it

### Security Notes

- All CRUD API endpoints require authentication
- Invalid passwords show: "Incorrect password. Please contact the administrator."
- Sessions expire after 24 hours
- Session tokens are stored in browser sessionStorage
- Expired sessions automatically redirect to login

## Usage

### 1. Load an Endpoint

1. Select an endpoint from the dropdown menu
2. Click "Load"
3. The form will populate with all existing data from the JSON file

### 2. Edit Fields

The form is organized into sections matching the JSON structure:

#### Basic Information
- **Endpoint** (Read-only)
- **Master Alias** (Required)
- **Unspecified Alias** (Required - anonymous user alias)

#### Stuffed Animal Media
- **Background Image** (Required - validates path)
- **Animals Array**
  - File path (Required - validates path)
  - Title (Required)
  - Add/Remove animals dynamically

#### Media Object
- **Paths** for songs, videos, photos
- **Songs Array**
  - File path (Required - validates path using songspath)
  - Title (Required)
- **Photos Array**
  - File path (Required - validates path using photospath)
  - Title (Required)
- **Videos Array**
  - File path (Required - validates path using videospath)
  - Title (Required)
  - Poster (Optional - validates path if provided, uses videospath)

#### Responses Object
- **Responses Array**
  - Response text (Required)

### 3. Validate

Click the "🔍 Validate" button to:

- Check all required fields are filled
- Validate all resource paths exist (200 OK)
- For HTTP URLs: Sends HEAD request to verify accessibility
- For local paths: Checks file exists on server
- Automatically prepends base paths (songs/, photos/, videos/) if not specified

Validation results appear next to each field:
- ✅ **Green "✓"**: Valid
- ✅ **Green "✓ 200"**: HTTP URL returns 200 OK
- ❌ **Red "Required"**: Field is empty
- ❌ **Red "404"**: Resource not found
- ❌ **Red "Error"**: Validation failed

### 4. Save

After successful validation:

1. Click "💾 Save" button
2. Confirm overwrite in the modal dialog
3. Click "Yes" to save changes
4. The JSON file will be updated with proper formatting

**Note**: The Save button is disabled until validation passes.

## Validation Rules

### Required Fields
- No empty fields allowed
- Master alias and anonymous alias must be provided
- All array items must have required fields filled

### Resource Path Validation
- **HTTP URLs**: Must start with `http://` or `https://` and return 200 OK
- **Local Files**:
  - If path doesn't start with "http", treated as local file
  - Auto-prepends base path for songs, photos, videos if needed
  - Must exist in the working directory
  - Validates against actual file system

### Special Handling
- **Endpoint field**: Read-only, cannot be changed
- **Video poster**: Optional field, validates only if provided, uses videospath (poster images are stored in videos directory)
- **Base paths**: Uses songspath, videospath, photospath for prepending to relative paths

## API Endpoints

The CRUD manager uses these backend API endpoints:

- `GET /crud` - Serves the CRUD manager page
- `GET /api/endpoints` - Lists all available endpoints
- `GET /api/endpoint/:name` - Gets endpoint configuration
- `POST /api/endpoint/:name` - Updates endpoint configuration
- `POST /api/validate-resource` - Validates resource paths

## Notes

- Form loads fields in the same order as the JSON structure
- Validation must pass before saving
- Save operation requires confirmation
- Changes are written immediately to the JSON file
- All endpoints must be unique entries in the index.js array
- All endpoint files must have entries (but not all index.js entries have files - they fall back to jim.json)

## Requirements Based on Your Specifications

✅ **No empty fields** - All required fields validated
✅ **All file fields must resolve (200 OK)** - Path validation checks existence
✅ **If no "http" in path** - Automatically prepends base path and validates
✅ **masterAlias & anonymous validation** - Both required fields
✅ **endpoint is read-only** - Field is disabled
✅ **Local storage paths must resolve** - Server-side validation checks file system
✅ **Validation passes before save** - Save button disabled until validated
✅ **Confirmation dialog** - Modal asks for confirmation when validation passes
✅ **Form loads in same order as JSON** - Matches jim.json structure exactly
✅ **Save on the fly** - Immediate write to JSON file
