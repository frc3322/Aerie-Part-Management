# Part Management System - Backend API Reference

## API Overview

The Part Management System backend provides a comprehensive REST API for managing engineering parts through their complete lifecycle. The API follows RESTful principles with consistent resource naming, HTTP methods, and response formats.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All API endpoints require authentication using the Flask secret key. The secret key must be provided with each request using one of the following methods:

### Authentication Methods

1. **X-API-Key Header** (recommended):
   ```
   X-API-Key: your-secret-key-here
   ```

2. **Query Parameter**:
   ```
   ?api_key=your-secret-key-here
   ```

3. **Request Body** (for POST/PUT requests):
   ```json
   {
     "api_key": "your-secret-key-here",
     ...other data...
   }
   ```

### Authentication Errors

If authentication fails, the API returns:

```json
{
  "error": "API key required",
  "details": "Provide X-API-Key header, api_key query parameter, or api_key in request body"
}
```

Or:

```json
{
  "error": "Invalid API key",
  "details": "The provided API key is not valid"
}
```

### Getting the Secret Key

The secret key is configured in `backend/config.py` and can be set via the `SECRET_KEY` environment variable. In development, it defaults to `'dev-secret-key-change-in-production'`.

---

## Authentication Check

### GET /api/parts/auth/check

Check if the provided API key is valid with rate limiting.

#### Description
This endpoint validates API key authentication and includes a mandated 2-second server-side delay to prevent rapid checking attempts. It also includes cache control headers to prevent 304 Not Modified responses.

#### Rate Limiting
- **Server-side delay**: 2 seconds between requests
- **Frontend cooldown**: 2 seconds between client-side calls

#### Example Request

```bash
GET /api/parts/auth/check
X-API-Key: your-secret-key-here
```

#### Response

```json
{
  "status": "authenticated",
  "message": "API key is valid",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Error Responses
- `401 Unauthorized`: Invalid or missing API key

#### Cache Control
This endpoint includes headers to prevent browser caching:
- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

## Response Format

All responses follow a consistent JSON structure:

### Success Response
```json
{
  "data": { ... },
  "message": "Operation successful",
  "status": "success"
}
```

### Error Response
```json
{
  "error": "Error description",
  "details": { ... },
  "status": "error"
}
```

### List Response
```json
{
  "parts": [ ... ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

## HTTP Status Codes

- `200 OK` - Successful operation
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `409 Conflict` - Business logic violation
- `500 Internal Server Error` - Server error

---

## Parts Resource

### GET /api/parts/

Retrieve a list of parts with optional filtering, searching, and pagination.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `category` | string | Filter by category: `review`, `cnc`, `hand`, `completed` | null |
| `search` | string | Search across name, notes, subsystem, assigned | null |
| `sort_by` | string | Sort field: `name`, `status`, `assigned`, `created_at` | `created_at` |
| `sort_order` | string | Sort order: `asc`, `desc` | `desc` |
| `limit` | integer | Maximum results per page | null (all) |
| `offset` | integer | Pagination offset | 0 |

#### Example Requests

```bash
# Get all parts
GET /api/parts/
X-API-Key: your-secret-key-here

# Get parts in review category
GET /api/parts/?category=review
X-API-Key: your-secret-key-here

# Search for parts
GET /api/parts/?search=gear
X-API-Key: your-secret-key-here

# Paginated results
GET /api/parts/?limit=20&offset=0&sort_by=name&sort_order=asc
X-API-Key: your-secret-key-here
```

#### Response

```json
{
  "parts": [
    {
      "id": 1,
      "type": "cnc",
      "name": "Drive Gear",
      "subsystem": "Drive System",
      "assigned": "John Doe",
      "status": "In Progress",
      "notes": "Check tooth profile",
      "file": "gear.stl",
      "onshapeUrl": "https://cad.onshape.com/...",
      "claimedDate": "2024-01-15T10:30:00Z",
      "category": "cnc",
      "createdAt": "2024-01-10T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": null,
  "offset": 0
}
```

---

### POST /api/parts/

Create a new part.

#### Request Body

```json
{
  "type": "cnc",
  "name": "New Part",
  "subsystem": "Drive System",
  "status": "Pending",
  "notes": "Part description",
  "file": "part.stl",
  "onshapeUrl": "https://cad.onshape.com/...",
  "category": "review"
}
```

#### Required Fields
- `status`: Current workflow status
- `category`: Workflow category

#### Optional Fields
- `type`: Part type (`cnc` or `hand`)
- `name`: Part name/description
- `subsystem`: System subsystem
- `notes`: Additional notes
- `file`: File reference
- `onshapeUrl`: External CAD URL

#### Response

```json
{
  "id": 2,
  "type": "cnc",
  "name": "New Part",
  "status": "Pending",
  "category": "review",
  "createdAt": "2024-01-20T14:30:00Z",
  "updatedAt": "2024-01-20T14:30:00Z"
}
```

---

### GET /api/parts/{id}

Retrieve a specific part by ID.

#### Parameters
- `id` (integer): Part ID

#### Response

Returns the complete part object as shown in the list endpoint.

#### Error Responses
- `404 Not Found`: Part with given ID doesn't exist

---

### PUT /api/parts/{id}

Update an existing part.

#### Parameters
- `id` (integer): Part ID

#### Request Body

Same as POST, but only includes fields to update. All fields are optional.

```json
{
  "name": "Updated Part Name",
  "status": "In Progress",
  "notes": "Updated notes"
}
```

#### Response

Returns the updated part object.

---

### DELETE /api/parts/{id}

Delete a part.

#### Parameters
- `id` (integer): Part ID

#### Response

```json
{
  "message": "Part deleted successfully"
}
```

---

## Workflow Operations

### POST /api/parts/{id}/approve

Approve a part for production, moving it to the appropriate category based on type.

#### Parameters
- `id` (integer): Part ID

#### Behavior
- Sets status to "Approved"
- Moves to `cnc` category if type is "cnc"
- Moves to `hand` category if type is "hand"

#### Response

Returns the updated part object.

---

### POST /api/parts/{id}/assign

Assign a part to a user.

#### Parameters
- `id` (integer): Part ID

#### Request Body

```json
{
  "assigned": "John Doe"
}
```

#### Behavior
- Sets the assigned field
- Sets claimed_date to current timestamp
- Updates status to "In Progress"

#### Response

Returns the updated part object.

---

### POST /api/parts/{id}/unclaim

Remove assignment from a part.

#### Parameters
- `id` (integer): Part ID

#### Behavior
- Clears the assigned field
- Clears claimed_date
- Resets status to "Pending"

#### Response

Returns the updated part object.

---

### POST /api/parts/{id}/complete

Mark a part as completed.

#### Parameters
- `id` (integer): Part ID

#### Behavior
- Sets status to "Completed"
- Moves category to "completed"

#### Response

Returns the updated part object.

---

### POST /api/parts/{id}/revert

Revert a completed part back to its previous category.

#### Parameters
- `id` (integer): Part ID

#### Behavior
- Moves back to `cnc` or `hand` category based on type
- Sets status to "In Progress"

#### Response

Returns the updated part object.

---

## File Management

### POST /api/parts/{id}/upload

Upload a STEP file for a part and automatically convert it to GLTF/GLB format for 3D visualization.

#### Parameters
- `id` (integer): Part ID

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**: Form data with `file` field containing the STEP file

#### Supported Formats
- `.step` files
- `.stp` files

#### Behavior
1. Validates file type and size
2. Stores original STEP file in `uploads/{part_id}/` directory
3. Automatically converts STEP to GLTF/GLB using cascadio library
4. Updates part's `file` field with filename
5. Returns conversion status and file paths

#### Example Request

```bash
curl -X POST "http://localhost:5000/api/parts/1/upload" \
  -H "X-API-Key: your-secret-key-here" \
  -F "file=@part.step"
```

#### Response

```json
{
  "message": "File uploaded successfully",
  "filename": "part.step",
  "file_path": "uploads/1/part.step",
  "conversion": {
    "success": true,
    "error": null,
    "gltf_path": "uploads/1/part.glb"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid file type or missing file
- `404 Not Found`: Part not found
- `500 Internal Server Error`: Upload or conversion failed

---

### GET /api/parts/{id}/download

Download the original STEP file for a part.

#### Parameters
- `id` (integer): Part ID

#### Behavior
- Returns the original STEP file as a download
- Sets appropriate headers for file download
- File served with `application/octet-stream` MIME type

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/parts/1/download" \
  -H "X-API-Key: your-secret-key-here" \
  -o downloaded_part.step
```

#### Error Responses
- `404 Not Found`: Part not found or no file associated

---

### GET /api/parts/{id}/model

Get the converted GLTF/GLB model file for 3D visualization.

#### Parameters
- `id` (integer): Part ID

#### Behavior
- Returns the GLTF/GLB file for browser-based 3D viewing
- Automatically converts STEP file if GLTF doesn't exist
- Served with `model/gltf-binary` MIME type for WebGL compatibility

#### Example Request

```bash
curl -X GET "http://localhost:5000/api/parts/1/model" \
  -H "X-API-Key: your-secret-key-here" \
  -o model.glb
```

#### Error Responses
- `404 Not Found`: Part not found or no model available
- `500 Internal Server Error`: Conversion failed

---

## Specialized Endpoints

### GET /api/parts/categories/{category}

Get all parts in a specific category. This is a convenience endpoint that applies the category filter.

#### Parameters
- `category` (string): Category name (`review`, `cnc`, `hand`, `completed`)

#### Query Parameters

Supports all query parameters from the main list endpoint except `category`.

#### Response

Same format as GET /api/parts/ but filtered by category.

---

### GET /api/parts/stats

Get system statistics.

#### Response

```json
{
  "by_category": {
    "review": 5,
    "cnc": 12,
    "hand": 8,
    "completed": 25
  },
  "by_status": {
    "pending": 10,
    "in_progress": 15,
    "completed": 25
  },
  "assignment": {
    "assigned": 30,
    "unassigned": 20
  },
  "total": 50
}
```

---

## Data Types and Validation

### Part Object Schema

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `id` | integer | auto | - | Unique identifier |
| `type` | string | no | 50 | 'cnc' or 'hand' |
| `name` | string | no | 200 | Part name |
| `subsystem` | string | no | 100 | System subsystem |
| `assigned` | string | no | 100 | Assigned user |
| `status` | string | yes | 50 | Workflow status |
| `notes` | string | no | - | Additional notes |
| `file` | string | no | 200 | File reference |
| `onshapeUrl` | string | no | 500 | External URL |
| `claimedDate` | datetime | auto | - | Assignment timestamp |
| `category` | string | yes | 20 | Workflow category |
| `createdAt` | datetime | auto | - | Creation timestamp |
| `updatedAt` | datetime | auto | - | Last update timestamp |

### Validation Rules

#### Type Validation
- `type`: Must be 'cnc' or 'hand' if provided
- `category`: Must be 'review', 'cnc', 'hand', or 'completed'
- `status`: Must be valid workflow status
- `onshapeUrl`: Must be valid URL if provided

#### Length Validation
- String fields are validated against maximum lengths
- Text fields (notes) have reasonable limits

#### Business Rules
- Category transitions follow workflow rules
- Assignment operations update related fields
- Completion moves parts to completed category

---

## Error Handling

### Common Error Responses

#### Validation Error
```json
{
  "error": "Validation failed",
  "details": {
    "field": "name",
    "message": "Name exceeds maximum length of 200 characters"
  }
}
```

#### Business Logic Error
```json
{
  "error": "Cannot approve part",
  "details": "Part is already in production"
}
```

#### Not Found Error
```json
{
  "error": "Part not found",
  "details": {
    "id": 999
  }
}
```

---

## Rate Limiting

Currently not implemented. For production, consider implementing rate limiting to prevent abuse.

## Versioning

API versioning not yet implemented. For future versions, use URL versioning: `/api/v1/parts/`

## SDK and Libraries

No official SDK available. Use standard HTTP libraries:

- **Python**: `requests` library
- **JavaScript**: `fetch` API or `axios`
- **curl**: Command line testing

## Testing the API

### Using curl

```bash
# Get all parts
curl -X GET "http://localhost:5000/api/parts/" \
  -H "X-API-Key: your-secret-key-here"

# Create a part
curl -X POST "http://localhost:5000/api/parts/" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key-here" \
  -d '{"name":"Test Part","status":"Pending","category":"review"}'

# Get specific part
curl -X GET "http://localhost:5000/api/parts/1" \
  -H "X-API-Key: your-secret-key-here"

# Update a part
curl -X PUT "http://localhost:5000/api/parts/1" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key-here" \
  -d '{"status":"In Progress"}'

# Alternative: Using query parameter
curl -X GET "http://localhost:5000/api/parts/?api_key=your-secret-key-here"
```

### Using Python

```python
import requests

# Set up headers with API key
headers = {'X-API-Key': 'your-secret-key-here'}

# Get parts
response = requests.get('http://localhost:5000/api/parts/', headers=headers)
parts = response.json()

# Create part
new_part = {
    'name': 'New Part',
    'status': 'Pending',
    'category': 'review'
}
response = requests.post('http://localhost:5000/api/parts/', json=new_part, headers=headers)

# Alternative: Using query parameter
response = requests.get('http://localhost:5000/api/parts/?api_key=your-secret-key-here')

# Alternative: Including API key in request body
new_part_with_key = {
    'api_key': 'your-secret-key-here',
    'name': 'New Part',
    'status': 'Pending',
    'category': 'review'
}
response = requests.post('http://localhost:5000/api/parts/', json=new_part_with_key)
```

## Performance Considerations

### Response Times
- Simple queries: < 100ms
- Complex searches: < 500ms
- Bulk operations: < 2s

### Pagination
Use pagination for large result sets:
```
GET /api/parts/?limit=50&offset=0
GET /api/parts/?limit=50&offset=50
```

### Caching
Implement client-side caching for frequently accessed data. Consider ETags for conditional requests.

## Monitoring

### Health Check
```
GET /api/health
```

### Metrics (Future)
- Request count and latency
- Error rates
- Database connection status
- Cache hit rates

## Changelog

### Version 1.0.0
- Initial API release
- Full CRUD operations
- Workflow management
- Search and filtering
- Statistics endpoint
