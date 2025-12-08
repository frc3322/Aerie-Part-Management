# Backend API Reference

## Authentication
All API endpoints require authentication via API key:
- Header: `X-API-Key: <your-key>`
- Query: `?api_key=<your-key>`
- Body: `{"api_key": "<your-key>"}` (POST/PUT requests)

## Parts Endpoints

### GET /api/parts/
**List parts with optional filtering**

Query Parameters:
- `category` (string): Filter by category (review, cnc, hand, completed)
- `search` (string): Search in name, notes, subsystem, assigned, material, part_id
- `sort_by` (string): Sort field (name, status, assigned, created_at)
- `sort_order` (string): asc or desc (default: desc)
- `limit` (int): Maximum results
- `offset` (int): Pagination offset

Response: `{"parts": [...], "total": int, "limit": int, "offset": int}`

### POST /api/parts/
**Create new part**

Required Fields: `partId`, `material`, `subsystem`
Optional Fields: `name`, `type`, `assigned`, `status`, `notes`, `file`, `onshapeUrl`, `category`, `amount`

Response: Created part object

### GET /api/parts/{id}
**Get specific part**

Response: Part object

### PUT /api/parts/{id}
**Update part**

Request: Partial part object with fields to update

Response: Updated part object

### DELETE /api/parts/{id}
**Delete part**

Response: Success confirmation

### POST /api/parts/{id}/upload
**Upload file for part**

Form Data: `file` (STEP or PDF file)

Response: `{"filename": string, "path": string}`

### GET /api/parts/{id}/download/{filename}
**Download part file**

Response: File download

### POST /api/parts/{id}/convert
**Convert STEP file to GLTF**

Response: `{"success": bool, "gltf_path": string, "error": string}`

### PUT /api/parts/{id}/assign
**Assign part to user**

Request: `{"assigned": string, "notes": string}`

Response: Updated part object

### PUT /api/parts/{id}/status
**Update part status**

Request: `{"status": string, "notes": string}`

Response: Updated part object

### PUT /api/parts/{id}/unclaim
**Unassign part**

Response: Updated part object (assigned set to null)

## Error Responses

All endpoints return JSON error responses with appropriate HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid API key)
- `404`: Not Found
- `500`: Internal Server Error

Error format: `{"error": "error message", "details": "additional info"}`