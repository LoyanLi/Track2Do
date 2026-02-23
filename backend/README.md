# PT-STEM Backend

A FastAPI + py-ptsl backend service for Pro Tools stem separation and audio processing.

## Features

### Core Capabilities
- **Pro Tools Connection Management**: Connect to and control Pro Tools via the PTSL protocol.
- **Session Information**: Retrieve detailed information for the active Pro Tools session.
- **Track Management**: List and manage Pro Tools tracks.
- **Transport Control**: Play, stop, record, and monitor transport state.
- **Audio Export**: Export audio for selected tracks or time ranges.
- **Stem Separation**: Split multitrack audio into separate stem files.
- **File Management**: Browse and download generated output files.

### Technical Characteristics
- **Async Processing**: Built on FastAPI async endpoints.
- **RESTful API**: Standard HTTP API patterns.
- **Realtime Status**: WebSocket support for status updates.
- **Error Handling**: Structured exception handling and logging.
- **Configuration Management**: Flexible environment-driven config.
- **CORS Support**: Cross-origin requests for frontend integration.

## System Requirements

### Software
- Python 3.8+
- Pro Tools (with PTSL support)
- macOS or Windows

### Python Dependencies
- FastAPI 0.104.1+
- py-ptsl 1.0.0+
- uvicorn
- pydantic
- loguru

## Installation and Configuration

PTSL SDK/runtime onboarding links and legal notes: `../docs/protocol/README.md`

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` and set required values:
```env
# Server configuration
HOST=127.0.0.1
PORT=8000
DEBUG=true

# PTSL configuration
PTSL_HOST=127.0.0.1
PTSL_PORT=31416
PTSL_TIMEOUT=30

# Other configuration...
```

### 3. Start the Service

#### Development Mode
```bash
python start.py --reload
```

#### Production Mode
```bash
python start.py --host 0.0.0.0 --port 8000 --workers 4
```

#### Run with uvicorn Directly
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## API Documentation

After startup, open:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Endpoints

### Connection Management
- `POST /api/v1/connection/connect` - Connect to Pro Tools
- `POST /api/v1/connection/disconnect` - Disconnect
- `GET /api/v1/connection/status` - Get connection status

### Session
- `GET /api/v1/session/info` - Get session details

### Track Management
- `GET /api/v1/tracks` - List tracks

### Transport Control
- `POST /api/v1/transport/play` - Start playback
- `POST /api/v1/transport/stop` - Stop playback
- `POST /api/v1/transport/record` - Start recording
- `GET /api/v1/transport/status` - Get transport status

### Audio Export
- `POST /api/v1/export/audio` - Export audio

### Stem Separation
- `POST /api/v1/stems/separate` - Separate stems

### File Management
- `GET /api/v1/files` - List files
- `GET /api/v1/files/download` - Download files

### System Status
- `GET /api/v1/system/health` - Health check
- `GET /` - Root status
- `GET /health` - Lightweight health check

## Usage Examples

### Connect to Pro Tools

```python
import requests

# Connect to Pro Tools
response = requests.post('http://localhost:8000/api/v1/connection/connect', json={
    "host": "127.0.0.1",
    "port": 31416,
    "timeout": 30
})

print(response.json())
```

### Get Track List

```python
# Fetch tracks
response = requests.get('http://localhost:8000/api/v1/tracks')
tracks = response.json()['tracks']

for track in tracks:
    print(f"Track: {track['name']}, Type: {track['type']}")
```

### Export Stems

```python
# Stem separation request
stem_request = {
    "output_dir": "./output/stems",
    "stem_configs": [
        {
            "name": "drums",
            "type": "drums",
            "tracks": ["Kick", "Snare", "Hi-Hat"]
        },
        {
            "name": "bass",
            "type": "bass",
            "tracks": ["Bass"]
        }
    ],
    "format": "WAV"
}

response = requests.post('http://localhost:8000/api/v1/stems/separate', json=stem_request)
result = response.json()

print(f"Generated stem files: {len(result['stem_files'])}")
for stem in result['stem_files']:
    print(f"- {stem['name']}: {stem['file_path']}")
```

## Project Structure

```text
backend/
├── main.py                 # Application entry
├── start.py                # Startup script
├── requirements.txt        # Python dependencies
├── .env.example            # Environment template
├── README.md               # Documentation
├── core/                   # Core modules
│   ├── __init__.py
│   ├── config.py           # Config management
│   └── ptsl_client.py      # PTSL client wrapper
├── api/                    # API routes
│   ├── __init__.py
│   └── routes.py           # Endpoint definitions
├── models/                 # Data models
│   ├── __init__.py
│   └── schemas.py          # Pydantic schemas
├── logs/                   # Log files
├── output/                 # Exported output
└── temp/                   # Temporary files
```

## Development Notes

### Add a New API Endpoint

1. Define request/response schemas in `models/schemas.py`.
2. Add route handlers in `api/routes.py`.
3. Implement corresponding PTSL logic in `core/ptsl_client.py`.

### Error Handling

All endpoints should include proper exception handling:

```python
try:
    # API logic
    result = await some_operation()
    return SuccessResponse(data=result)
except Exception as e:
    logger.error(f"Operation failed: {e}")
    raise HTTPException(status_code=500, detail=str(e))
```

### Logging

Use `loguru` for structured logs:

```python
from loguru import logger

logger.info("info log")
logger.warning("warning log")
logger.error("error log")
```

## Deployment

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["python", "start.py", "--host", "0.0.0.0"]
```

### Production Recommendations

1. Set `DEBUG=false`.
2. Configure an appropriate log level.
3. Run behind a reverse proxy (for example, Nginx).
4. Configure SSL certificates.
5. Restrict network access with firewall rules.

## Troubleshooting

### Common Issues

1. **Cannot connect to Pro Tools**
   - Ensure Pro Tools is running with PTSL enabled.
   - Check firewall settings.
   - Verify PTSL host and port configuration.

2. **Export failure**
   - Check output directory permissions.
   - Ensure sufficient disk space.
   - Verify track names in export configuration.

3. **Performance issues**
   - Increase worker count.
   - Optimize audio format settings.
   - Check system resource usage.

### Log Inspection

View runtime logs:
```bash
tail -f logs/app.log
```

## License

MIT License

## Contributing

Issues and pull requests are welcome.
